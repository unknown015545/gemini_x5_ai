import axios from "axios";
import { Message, OmitPartialGroupDMChannel } from "discord.js";

export async function formatMembers<isGuild extends boolean>(
  message: OmitPartialGroupDMChannel<Message<isGuild>>,
) {
  if (message.guild?.members == null) return undefined;

  const originalMembers = await message.guild.members.fetch();
  const formattedMembers: { username: string; id: string }[] = [];

  originalMembers.map((member) => {
    formattedMembers.push({
      username: member.user.username,
      id: member.user.id,
    });
  });

  return formattedMembers;
}

export async function generateRequest<isGuild extends boolean>(
  message: OmitPartialGroupDMChannel<Message<isGuild>>,
) {
  return JSON.stringify({
    author: {
      username: message.author.username,
      id: message.author.id,
    },
    guild: {
      name: message.guild?.name,
      id: message.guild?.id,
      owner: message.guild?.ownerId,
      members: await formatMembers(message),
      memberCount: message.guild?.memberCount,
      channel: {
        id: message.channelId,
        name: message.guild?.channels.cache.get(message.channelId)?.name,
      },
    },
    inDM: message.guild ? false : true,
    message: message.content,
    createdAt: message.createdAt,
  });
}

export async function downloadAsBase64(url: string) {
  const response = await axios({
    url,
    responseType: "arraybuffer",
  });
  return Buffer.from(response.data).toString("base64");
}
