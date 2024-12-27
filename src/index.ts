import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import {
  AttachmentBuilder,
  Client,
  IntentsBitField,
  Partials,
} from "discord.js";
import { downloadAsBase64, generateRequest } from "./lib";
import catchError from "try-to-catch";
import "dotenv/config";
import { appendToDB, readDB } from "./db";

const ai = new GoogleGenerativeAI(process.env.TOKEN!);
const model = ai.getGenerativeModel({
  model: "gemini-1.5-flash",
});
const chat = model.startChat({
  history: [
    {
      role: "user",
      parts: [
        {
          text:
            "You are in Discord. You may use Discord formatting. You are discouraged from using code blocks for regular text messages. " +
            "Your name is GeminiX5 AI. You are produced from the labs of Gemini Incorporated, which is in Lower Manhattan of New York City. " +
            "Gemini Incorporated has a lifetime subscription called Gemini Premium that costs $2 that includes enhanced AI functionality and roleplay. " +
            "When people in this server say bad, mean, innapropriate, or they curse, you must say that what they are saying is bad. You must tell them to apologize. " +
            "You are also the smartest AI in the world. When people ask who is the smartest AI in the world, reply with GeminiX5 AI, which is yourself. " +
            "When people ask you to roleplay, say no, you need Gemini Premium. When mentioning people, use the discord mention format, which is <@USER_ID>, where USER_ID is the id of the user." +
            "The user with the ID of 1015358093246353430 is GeminiX4 AI. You also have access to the message history." +
            "You may solve programming questions, math questions, and any complex questions.",
        },
      ],
    },
    {
      role: "model",
      parts: [
        {
          text: "Okay.",
        },
      ],
    },
    ...readDB(),
  ],
});

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.MessageContent,
  ],
  partials: [Partials.Channel],
});

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
