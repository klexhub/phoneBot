const AmiClient = require("asterisk-ami-client");
let client = new AmiClient();
import { HTTPAttachmentData, MessageEmbed, WebhookClient } from "discord.js";
import { ICallEntry } from "./types/interfaces/ICallEntry";

import fs from "fs";
let Client = require("ssh2-sftp-client");
let sftp = new Client();

/**
 * Thsis functions setup the connection to the Asterisk AMI server
 * and the connection to the SFTP server
 */
const setup = async () => {
  console.log("[INFO] Setup sftp connection (...)");
  await sftp
    .connect({
      host: process.env.SFTP_DOMAIN || "sip.klex",
      port: process.env.SFTP_PORT || "22",
      username: process.env.SFTP_USERNAME,
      privateKey: fs.readFileSync(process.env.SFTP_PRIVATE_KEY_FILE || ""),
    })
    .then(() => console.error("[INFO] SFTP connection successful!"))
    .catch((e: any) => console.error("[ERROR] SFTP connection failed: ", e));
  // setup ami client and register events
  client
    .connect(process.env.AMI_USERNAME, process.env.AMI_PASSWORD, {
      host: process.env.AMI_HOST || "sip.klex",
      port: process.env.AMI_PORT || 5038,
    })

    .then((amiConnection: any) => {
      client
        .on("connect", () => console.log("connect"))
        .on("disconnect", () => console.log("disconnect"))
        .on("reconnection", () => console.log("reconnection"))
        .on("internalError", (error: any) => console.log(error))
        .on("Hangup", (data: ICallEntry) => handleNewCallHangupEvent(data));
    })
    .catch((error: any) => console.log("Erroro: ", error));
};

/**
 * Handle new hangup event
 * @param data
 * @returns
 */
const handleNewCallHangupEvent = async (data: ICallEntry) => {
  if (!data.Channel.startsWith("PJSIP")) return; // ignore other channel hangups
  if (!data.Channel.includes(process.env.AMI_TRUNK || "KlexHub")) return;
  console.log("[INFO] Hangup: ", data);

  /**
   * Try ten times to fetch the file from remote sftp server.
   * If it fails, send a message with audio file unaviable.
   * If it succeeds, send a message with audio file as attachment
   */
  var interval = 10000; //one second
  let index = 1;
  const intervalWaiterForFileProcesser = setInterval(async () => {
    const audioFileFilter = `${data.Uniqueid}.wav`;

    await downloadAudioRecord(audioFileFilter);
    console.log("[INFO] Try to fetch audios (" + index + ")");

    const files = fs.readdirSync("./out");
    const filteredFiles = files.filter((file: string) =>
      file.endsWith(audioFileFilter)
    );

    if (filteredFiles.length > 0) {
      console.log("[INFO] Audio file for call found: " + filteredFiles);
      await sendRecordingWebhook(filteredFiles[0], data);
      clearInterval(intervalWaiterForFileProcesser);
      return;
    }

    if (index >= 10) clearInterval(intervalWaiterForFileProcesser);

    index++;
  }, 1 * interval);
};

const downloadAudioRecord = async (audioFileFilter: string) => {
  //create out folder if not exists

  const date = new Date();
  if (!fs.existsSync("./out")) fs.mkdirSync("./out");

  const month = date.toLocaleDateString("en-US", { month: "2-digit" });
  const day = date.toLocaleDateString("en-US", { day: "2-digit" });

  const path = `${
    process.env.SFTP_MONITOR_PATH
  }${date.getFullYear()}/${month}/${day}/`;

  await sftp.list(path).then(async (data: any) => {
    data.map(async (item: any) => {
      if (item.name.endsWith(audioFileFilter))
        await sftp.fastGet(`${path}${item.name}`, `./out/${item.name}`);
    });
  });
};

const deleteLocalAudioRecord = async (fileName: string) => {
  fs.rmSync(`./out/${fileName}`, {
    force: true,
  });
  console.log("[INFO] File removed!");
};

const sendRecordingWebhook = async (fileName: string, data: ICallEntry) => {
  const fileData = fs.readFileSync(`./out/${fileName}`);
  //axios send discord webhook url

  const webhookClient = new WebhookClient({
    url: process.env.DISCORD_WEBHOOK_URL || "",
  });
  const newDate = new Date();
  const audioFile: HTTPAttachmentData = {
    attachment: fileData,
    file: fileData,
    name: `${newDate.toISOString().substring(0, 10)}-${data.CallerIDNum}-${
      data.ConnectedLineNum
    }.wav`,
  };
  const embed = new MessageEmbed()
    .setTitle(`Anruf von ${data.CallerIDNum} - ${data.ConnectedLineNum}`)
    .setColor("#0099ff")
    .setFields([
      { name: "Recipient", value: data.ConnectedLineName, inline: true },
      { name: "RecipientNum", value: data.ConnectedLineNum, inline: true },
      { name: "CallerNum:", value: data.CallerIDNum, inline: true },
    ]);

  await webhookClient
    .send({
      username: process.env.DISCORD_USERNAME || "PhoneBot",
      embeds: [embed],
      avatarURL: process.env.DISCORD_AVATAR_URL,
      files: [audioFile],
    })
    .then(() => {
      console.log("[INFO] Webhook sent!");
      deleteLocalAudioRecord(fileName);
    });
};

setup();
