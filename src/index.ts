import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v9"
import {
	ActionRowBuilder,
	ActivityType,
	ButtonBuilder,
	ButtonStyle,
	Client,
	ContextMenuCommandInteraction,
	DMChannel,
	GatewayIntentBits,
	InteractionReplyOptions,
	Message,
	MessageActionRowComponentBuilder,
	NewsChannel,
	TextChannel,
	ThreadChannel,
} from "discord.js"
import { config as dotenvConfig } from "dotenv"
import fetch from "node-fetch"
import scalePixelArt from "scale-pixel-art"

type APIMessage = any // fixes errors temporarily

dotenvConfig()

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
})

// client logs in
client.once("ready", () => {
	console.log("Logged in as", client.user?.tag)

	// set status
	;(function updateStatus() {
		client.user?.setActivity(`${client.guilds.cache.size} servers`, {
			type: ActivityType.Watching,
		})

		// update every four hours
		setTimeout(updateStatus, 60 * 60 * 1000 * 4)
	})()

	// slash commands and context menus

	const rest = new REST({ version: "9" }).setToken(process.env.BOT_TOKEN!)

	// refresh slash commands and context menus
	;(async () => {
		try {
			console.log("Started refreshing slash commands and context menus")

			await rest.put(
				process.env.NODE_ENV === "production"
					? // register as global commands if in production environment
					  Routes.applicationCommands(client.user!.id)
					: // else register as guild commands (if in development environment)
					  (Routes.applicationGuildCommands(
							client.user!.id,
							process.env.TESTING_SERVER_ID!,
					  ) as unknown as `/${string}`),

				{
					body: [
						{
							name: "ping",
							description: "Checks the bot is online.",
						},
						{
							name: "invite",
							description: "Invite Picasso to your own server.",
						},
						{
							name: "scale-pixel-art",
							description: "Scales pixel art from an attachment.",
							options: [
								{
									name: "image",
									description: "The image to scale",
									type: 11, // attachment
									required: true,
								},
							],
						},
						{
							type: 3, // message context menu
							name: "Scale pixel art",
						},
					],
				},
			)
		} catch (error) {
			console.error(error)
		}
	})().then(() =>
		console.log("Finished refreshing slash commands and context menus"),
	)
})

/** Determines whether a given messsage is a `Message` or a `APIMessage`
 * @param {APIMessage | Message} message - The message to check
 * @returns {boolean} - `true` if the message is a `Message`, `false` if it is a `APIMessage`
 */
const isRealMessage = (message: Message | APIMessage) =>
	(message as Message).url !== undefined

/** Scales an image from a given message. Will show the user errors if something goes wrong (e.g. there is no image on the message)
 * @param {Message} message - The message to scale from
 * @param {boolean} isFromReply - Whether this has been triggered from a reply to a message with a reply
 * @param {ContextMenuCommandInteraction} [interaction] - The interaction to reply to
 * @returns {Promise<boolean>} - `true` if the nothing was sent, and the message was a reply.
 */
const scaleImageFromMessage = async (
	message: Message,
	interaction: ContextMenuCommandInteraction,
) => {
	const attachments = Array.from(message.attachments)
	const attachment = attachments.length > 0 ? attachments[0][1] : null

	/** Replies to the message given by the parent function. If `interactionReply` exists, the message will be a reply to an interaction. Otherwise, the message containing the original image will be replied to.
	 * @param {InteractionReplyOptions} options - Options for the reply. Includes `content`, `ephemeral`, and `components`.
	 * @returns {void}
	 * @example
	 * // Replys to the message with the content "Hello, world!" and with an attached file; ephemerally if an interaction reply is used.
	 * reply(
			{
				content: "Hello, world",
				files: [{ attachment: fs.readFileSync("./hello_world.txt") }],
			},
			{ ephemeral: true },
		)
	 */
	const reply = (options: InteractionReplyOptions) => {
		interaction.reply(options)
	}

	if (!attachment?.width) {
		reply({
			content:
				"Picasso can only scale pixel art on messages that have an image attached.",
			ephemeral: true,
		})
	} else if (typeof attachment === "string") {
		reply({
			content: "Could not fetch attachment: was of type `string`",
			ephemeral: true,
		})
	} else if (attachment.proxyURL.endsWith(".gif")) {
		reply({
			content:
				"Picasso can not scale GIFs yet. Please upload a PNG or JPG still image.",
			ephemeral: true,
		})
	} else if (!/\.(png|jpg|jpeg)$/.test(attachment.proxyURL)) {
		reply({
			content: "Attachments must be a PNG or JPG image.",
			ephemeral: true,
		})
	} else {
		try {
			const imageBuffer = await (await fetch(attachment.proxyURL)).buffer()
			const scaleFactor = Math.floor(
				512 / // max width or length of scaled image
					Math.min(attachment.width!, attachment.height!),
			)

			if (scaleFactor < 1) {
				return reply({
					content: "Image is too large to scale.",
					ephemeral: true,
				})
			}

			const scaledBuffer = await scalePixelArt(imageBuffer, scaleFactor)

			const row =
				new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
					new ButtonBuilder()
						.setLabel("Original message")
						.setStyle(ButtonStyle.Primary)
						.setURL(message.url),
				)

			reply({
				files: [
					{
						attachment: scaledBuffer,
						name: `${message.id}-${attachment.id}-scaled.png`,
					},
				],
				ephemeral: false,
				components: [row],
			})
		} catch (error) {
			reply({
				content: `Scaling or fetching the image failed:\n\`\`\`${error}\`\`\``,
				ephemeral: true,
			})
		}
	}
}

// receive interactions
client.on("interactionCreate", async (interaction) => {
	if (interaction.isCommand()) {
		if (interaction.commandName === "ping") {
			await interaction.reply("Pong!")
		} else if (interaction.commandName === "invite") {
			await interaction.reply({
				content: "Invite Picasso to your own server:",
				components: [
					new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Primary)
							.setLabel("Invite me!")
							.setURL(
								`https://discord.com/oauth2/authorize?client_id=${
									client.user!.id
								}&scope=bot&permissions=35840`,
							),
					),
				],
			})
		} else if (interaction.commandName === "scale-pixel-art") {
			console.log(interaction.options.get("image", true))
			await interaction.reply("Coming soon...")
		}
	} else if (interaction.isContextMenuCommand()) {
		if (interaction.commandName === "Scale pixel art") {
			const originalMessage = interaction.options.getMessage("message") as
				| Message
				| APIMessage

			const originalMessageIsReal = isRealMessage(originalMessage)

			// code to give user error if bot is not in server.
			// doesn't currently work, and not sure why this was necessary.
			// leaving in for now in case it is needed it later

			// console.debug({ originalMessage, originalMessageIsReal })

			// if (!originalMessageIsReal) {
			// 	const apiMessage = originalMessage as APIMessage
			// 	const channelId = apiMessage.channel_id
			// 	console.debug({
			// 		channelId,
			// 		clientIsInChannel: client.channels.cache.has(channelId!),
			// 	})
			// 	if (!channelId || !client.channels.cache.has(channelId)) {
			// 		// no guild or guild not cached - the client is not in the guild
			// 		return interaction.reply({
			// 			content:
			// 				"Picasso must be in the server and have access to the channel to work.",
			// 			ephemeral: true,
			// 			components: [
			// 				new ActionRow().addComponents(
			// 					new ButtonComponent()
			// 						.setLabel("Invite to server")
			// 						.setStyle("LINK")
			// 						.setURL(
			// 							`https://discord.com/oauth2/authorize?client_id=${
			// 								client.user!.id
			// 							}&scope=bot&permissions=35840`,
			// 						),
			// 				),
			// 			],
			// 		})
			// 	}
			// }

			const message = originalMessageIsReal
				? (originalMessage as Message)
				: await (
						(await client.channels.fetch(
							(originalMessage as APIMessage).channel_id,
						)) as TextChannel | NewsChannel | ThreadChannel | DMChannel
				  ).messages.fetch((originalMessage as APIMessage).id)

			await scaleImageFromMessage(message, interaction)
		}
	}
})

// log in client
client.login(process.env.BOT_TOKEN)
