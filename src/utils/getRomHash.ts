export async function getRomHash(rom: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', rom);
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
} 