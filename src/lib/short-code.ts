import { customAlphabet } from 'nanoid';
import { siteConfig } from './config';

// No 0/O/1/l/I — avoids ambiguous characters when a short code is read off a printed QR code.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export const generateShortCode = customAlphabet(ALPHABET, siteConfig.shortCodeLength);
