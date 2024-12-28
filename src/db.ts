import { readFileSync, writeFileSync } from "node:fs";

export function readDB() {
  return JSON.parse(readFileSync("./db.json").toString("utf8"));
}

export function appendToDB(role: string, text: string) {
  let db: any[] = readDB();

  if (db.length > 60) {
    db.shift();
  }

  db.push({
    role,
    parts: [{ text }],
  });

  writeFileSync("./db.json", JSON.stringify(db));
}
