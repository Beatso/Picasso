import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v9"
import {
	ActionRowBuilder,
	ActivityType,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ContextMenuCommandInteraction,
	DMChannel,
	EmbedBuilder,
	GatewayIntentBits,
	Message,
	MessageActionRowComponentBuilder,
	MessageAttachment,
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

let inviteLink: string

// client logs in
client.once("ready", () => {
	console.log("Logged in as", client.user?.tag)

	inviteLink = `https://discord.com/oauth2/authorize?client_id=${
		client.user!.id
	}&scope=bot&permissions=35840`

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
							name: "help",
							description: "Information on how to use the bot.",
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
 * @param {ContextMenuCommandInteraction | ChatInputCommandInteraction} interaction - The interaction that triggered the command
 * @param {MessageAttachment} attachment - The attachment to scale. This may be invalid; validation is performed in the function
 * @param {string} [originalMessageUrl] - The URL of the message that triggered the command. [optional]
 * @returns {Promise<boolean>} - `true` if the nothing was sent, and the message was a reply.
 */
const scaleImageAndSend = async (
	interaction: ContextMenuCommandInteraction | ChatInputCommandInteraction,
	attachment: MessageAttachment | null,
	originalMessageUrl?: string,
) => {
	if (!interaction.deferred) {
		interaction.deferReply()
	}
	if (!attachment?.width) {
		interaction.editReply({
			content:
				"Picasso can only scale pixel art on messages that have an image attached.",
		})
	} else if (typeof attachment === "string") {
		interaction.editReply({
			content: "Could not fetch attachment: was of type `string`",
		})
	} else if (attachment.proxyURL.endsWith(".gif")) {
		interaction.editReply({
			content:
				"Picasso can not scale GIFs yet. Please upload a PNG or JPG still image.",
		})
	} else if (!/\.(png|jpg|jpeg)$/.test(attachment.proxyURL)) {
		interaction.editReply({
			content: "Attachments must be a PNG or JPG image.",
		})
	} else {
		try {
			const imageBuffer = await (await fetch(attachment.proxyURL)).buffer()
			const scaleFactor = Math.floor(
				512 / // max width or length of scaled image
					Math.min(attachment.width!, attachment.height!),
			)

			if (scaleFactor < 1) {
				return interaction.editReply({
					content: "Image is too large to scale.",
				})
			}

			const scaledBuffer = await scalePixelArt(imageBuffer, scaleFactor)

			const row = originalMessageUrl
				? [
						new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
							new ButtonBuilder()
								.setLabel("Original message")
								.setStyle(ButtonStyle.Link)
								.setURL(originalMessageUrl),
						),
				  ]
				: []

			interaction.editReply({
				files: [
					{
						attachment: scaledBuffer,
						name: `${attachment.id}-scaled.png`,
					},
				],
				components: row,
			})
		} catch (error) {
			interaction.editReply({
				content: `Scaling or fetching the image failed:\n\`\`\`${error}\`\`\``,
			})
		}
	}
}

// receive interactions
client.on("interactionCreate", async (interaction) => {
	if (interaction.isChatInputCommand()) {
		if (interaction.commandName === "ping") {
			await interaction.reply("Pong!")
		} else if (interaction.commandName === "invite") {
			await interaction.reply({
				content: "Invite Picasso to your own server:",
				components: [
					new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Link)
							.setLabel("Invite me!")
							.setURL(inviteLink),
					),
				],
			})
		} else if (interaction.commandName === "help") {
			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle("Picasso Help")
						.setDescription(
							"There are two ways to use Picasso: with a slash command (`/scale-pixel-art`), or with a context menu (right-click on a message with an image you'd like to scale) (see below).",
						)
						.setImage(
							"https://cdn.discordapp.com/attachments/725328147742195822/953405061311127562/7ff7bf4f-9a27-4873-b742-2d74a9bb4b46.gif",
						)
						.setColor(interaction.guild!.me!.displayColor || null)
						.setThumbnail(client.user!.avatarURL()),
				],
				components: [
					new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Link)
							.setLabel("Invite to your server")
							.setURL(inviteLink),
						new ButtonBuilder()
							.setStyle(ButtonStyle.Link)
							.setLabel("GitHub")
							.setURL("https://github.com/Beatso/Picasso"),
						new ButtonBuilder()
							.setStyle(ButtonStyle.Link)
							.setLabel("Support server")
							.setURL("https://discord.gg/MgM3w6YFWy"),
					),
					new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Link)
							.setLabel("Terms of Service")
							.setURL(
								"https://github.com/Beatso/Picasso/blob/main/legal/TERMS_OF_SERVICE.md",
							),
						new ButtonBuilder()
							.setStyle(ButtonStyle.Link)
							.setLabel("Privacy Policy")
							.setURL(
								"https://github.com/Beatso/Picasso/blob/main/legal/PRIVACY_POLICY.md",
							),
					),
				],
			})
		} else if (interaction.commandName === "scale-pixel-art") {
			await interaction.deferReply()
			console.log(interaction.options.get("image", true))
			const attachment = interaction.options.get("image", true).attachment
			if (attachment === undefined) {
				interaction.editReply("Could not find an image to scale.")
			}
			await scaleImageAndSend(interaction, attachment as MessageAttachment)
			// await interaction.reply("Coming soon...")
		}
	} else if (interaction.isContextMenuCommand()) {
		await interaction.deferReply()
		if (interaction.commandName === "Scale pixel art") {
			const originalMessage = interaction.options.getMessage("message") as
				| Message
				| APIMessage

			const originalMessageIsReal = isRealMessage(originalMessage)

			const message = originalMessageIsReal
				? (originalMessage as Message)
				: await (
						(await client.channels.fetch(
							(originalMessage as APIMessage).channel_id,
						)) as TextChannel | NewsChannel | ThreadChannel | DMChannel
				  ).messages.fetch((originalMessage as APIMessage).id)

			const attachments = Array.from(message.attachments)
			const attachment = attachments.length > 0 ? attachments[0][1] : null

			await scaleImageAndSend(interaction, attachment, message.url)
		}
	}
})

// log in client
client.login(process.env.BOT_TOKEN)
