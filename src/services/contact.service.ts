import { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "../config/db";
import { Contact } from "../models/contact.model";

interface IdentifyRequest {
  email?: string | null;
  phoneNumber?: string | null;
}

interface IdentifyResponse {
  contact: {
    primaryContatctId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

async function findContactById(id: number): Promise<Contact | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM contacts WHERE id = ? AND deletedAt IS NULL",
    [id]
  );
  return (rows[0] as Contact) || null;
}

async function findContactsByEmailOrPhone(email?: string | null, phoneNumber?: string | null): Promise<Contact[]> {
  const conditions: string[] = [];
  const values: string[] = [];

  if (email) {
    conditions.push("email = ?");
    values.push(email);
  }
  if (phoneNumber) {
    conditions.push("phoneNumber = ?");
    values.push(phoneNumber);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM contacts WHERE (${conditions.join(" OR ")}) AND deletedAt IS NULL ORDER BY createdAt ASC`,
    values
  );
  return rows as Contact[];
}

async function findContactsByLinkedId(linkedId: number): Promise<Contact[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM contacts WHERE linkedId = ? AND deletedAt IS NULL ORDER BY createdAt ASC",
    [linkedId]
  );
  return rows as Contact[];
}

async function createContact(data: { email?: string | null; phoneNumber?: string | null; linkedId?: number | null; linkPrecedence: string }): Promise<Contact> {
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO contacts (email, phoneNumber, linkedId, linkPrecedence) VALUES (?, ?, ?, ?)",
    [data.email || null, data.phoneNumber || null, data.linkedId || null, data.linkPrecedence]
  );
  const contact = await findContactById(result.insertId);
  return contact!;
}

async function getAllLinkedContacts(contactIds: number[]): Promise<Contact[]> {
  const visited = new Set<number>();
  const queue = [...contactIds];
  const allContacts: Contact[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const contact = await findContactById(currentId);
    if (!contact) continue;
    allContacts.push(contact);

    if (contact.linkedId && !visited.has(contact.linkedId)) {
      queue.push(contact.linkedId);
    }

    const children = await findContactsByLinkedId(currentId);
    for (const child of children) {
      if (!visited.has(child.id)) {
        queue.push(child.id);
      }
    }
  }

  return allContacts;
}

function buildResponse(primary: Contact, allContacts: Contact[]): IdentifyResponse {
  const emails: string[] = [];
  const phoneNumbers: string[] = [];
  const secondaryContactIds: number[] = [];

  if (primary.email) emails.push(primary.email);
  if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);

  const secondaries = allContacts
    .filter((c) => c.id !== primary.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const contact of secondaries) {
    secondaryContactIds.push(contact.id);
    if (contact.email && !emails.includes(contact.email)) {
      emails.push(contact.email);
    }
    if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) {
      phoneNumbers.push(contact.phoneNumber);
    }
  }

  return {
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds,
    },
  };
}

export async function identify(data: IdentifyRequest): Promise<IdentifyResponse> {
  const { email, phoneNumber } = data;

  if (!email && !phoneNumber) {
    throw new Error("At least one of email or phoneNumber is required");
  }

  const matchingContacts = await findContactsByEmailOrPhone(email, phoneNumber);

  if (matchingContacts.length === 0) {
    const newContact = await createContact({
      email: email || null,
      phoneNumber: phoneNumber || null,
      linkPrecedence: "primary",
    });
    return buildResponse(newContact, [newContact]);
  }

  const allContactIds = new Set<number>();
  for (const contact of matchingContacts) {
    allContactIds.add(contact.id);
    if (contact.linkedId) allContactIds.add(contact.linkedId);
  }

  const allContacts = await getAllLinkedContacts([...allContactIds]);

  const primaries = allContacts
    .filter((c) => c.linkPrecedence === "primary")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const primaryContact = primaries[0];

  if (primaries.length > 1) {
    for (let i = 1; i < primaries.length; i++) {
      await pool.query(
        "UPDATE contacts SET linkPrecedence = 'secondary', linkedId = ?, updatedAt = NOW() WHERE id = ?",
        [primaryContact.id, primaries[i].id]
      );
      await pool.query(
        "UPDATE contacts SET linkedId = ?, updatedAt = NOW() WHERE linkedId = ?",
        [primaryContact.id, primaries[i].id]
      );
    }

    const refreshed = await getAllLinkedContacts([primaryContact.id]);
    return buildResponse(primaryContact, refreshed);
  }

  const alreadyExists = matchingContacts.some(
    (c) =>
      (email ? c.email === email : true) &&
      (phoneNumber ? c.phoneNumber === phoneNumber : true)
  );

  const hasNewInfo =
    (email && !allContacts.some((c) => c.email === email)) ||
    (phoneNumber && !allContacts.some((c) => c.phoneNumber === phoneNumber));

  if (!alreadyExists && hasNewInfo) {
    const newSecondary = await createContact({
      email: email || null,
      phoneNumber: phoneNumber || null,
      linkedId: primaryContact.id,
      linkPrecedence: "secondary",
    });
    allContacts.push(newSecondary);
  }

  return buildResponse(primaryContact, allContacts);
}
