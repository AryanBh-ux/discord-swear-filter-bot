export const guildIconURL = (guildId: string, icon: string | null, size=128) =>
  icon
    ? `https://cdn.discordapp.com/icons/${guildId}/${icon}.png?size=${size}`
    : `https://ui-avatars.com/api/?name=${guildId}&background=5865F2&color=fff&size=${size}`
