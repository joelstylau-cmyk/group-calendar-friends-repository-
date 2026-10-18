import { customAlphabet } from 'nanoid'

// 12 Zeichen aus [0-9a-z]: ca. 62 Bit Zufall, nicht ratbar, gut tippbar.
export const createSlug = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)
