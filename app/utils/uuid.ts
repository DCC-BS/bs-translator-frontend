import { v7 as uuid } from "uuid";

export function createUUID(): string {
    return uuid();
}
