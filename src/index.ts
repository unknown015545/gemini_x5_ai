import { Part } from "@google/generative-ai";
import { AttachmentBuilder } from "discord.js";
import { downloadAsBase64, generateRequest } from "./lib";
import catchError from "try-to-catch";
import { appendToDB } from "./db";
import { chat } from "./ai";
import { client } from "./discord";
import "dotenv/config";

client.on("ready", () => {
  console.log("Ready!");
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const [error, prompt] = await catchError(
    async () => await generateRequest(msg),
  );
  if (error != null) {
    await catchError(async () => await msg.reply("Error occurred!"));
    return;
  }

  appendToDB("user", prompt);
  const request: Array<string | Part> = [prompt!];
  if (msg.attachments.size > 0) {
    const [error] = await catchError(async () =>
      Promise.all(
        msg.attachments.map(async (file) => {
          request.push({
            inlineData: {
              data: await downloadAsBase64(file.url),
              mimeType: file.contentType || "text/plain",
            },
          });
        }),
      ),
    );

    if (error != null) {
      await catchError(async () => await msg.reply("Error occurred!"));
      return;
    }
  }
  const [msgError, message] = await catchError(
    async () => await msg.reply("*Generating..*."),
  );
  if (msgError) {
    return;
  }
  const [aiError, response] = await catchError(
    async () => await chat.sendMessage(request),
  );
  if (aiError) {
    await catchError(async () => await msg.reply("Error occurred!"));
    return;
  }

  const text = response!.response.text();
  if (text.length > 2000) {
    const file = new AttachmentBuilder(Buffer.from(text)).setName(
      "response.txt",
    );
    const [error] = await catchError(
      async () =>
        await msg.reply({
          files: [file],
        }),
    );
    if (error) {
      await catchError(async () => await msg.reply("Error occurred!"));
      return;
    }
  }

  await catchError(async () => await message.edit(text));
  appendToDB("model", text);
});

client.login(process.env.BOT_TOKEN!);

client.on("error", (error) => {
  console.log(error);
});
