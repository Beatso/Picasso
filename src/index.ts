import { REST } from "@discordjs/rest"
import { APIAttachment, Routes } from "discord-api-types/v9"
import { Client, Intents, Message } from "discord.js"
import { config as dotenvConfig } from "dotenv"

dotenvConfig()

const client = new Client({
	intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES],
})

// client logs in
client.once("ready", () => {
	console.log("Logged in as", client.user?.tag)

	// set status
	;(function updateStatus() {
		client.user?.setActivity(`${client.guilds.cache.size} servers`, {
			type: "WATCHING",
		})

		// update every four hours
		setTimeout(updateStatus, 60 * 60 * 1000 * 4)
	})()

	// slash commands and context menus

	const rest = new REST({ version: "9" }).setToken(process.env.bottoken!)

	// refresh slash commands and context menus
	;(async () => {
		try {
			console.log("Started refreshing slash commands and context menus")

			await rest.put(
				Routes.applicationGuildCommands(
					client.user!.id,
					"725272235090378803",
				) as unknown as `/${string}`,
				{
					body: [
						{
							name: "ping",
							description: "Checks the bot is online.",
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

// receive interactions
client.on("interactionCreate", async (interaction) => {
	if (interaction.isCommand()) {
		if (interaction.commandName === "ping") {
			await interaction.reply("POng!")
		}
	} else if (interaction.isContextMenu()) {
		if (interaction.commandName === "Scale pixel art") {
			const message = interaction.options.getMessage("message") as Message
			const attachments = Array.from(message.attachments)
			const attachment =
				attachments.length > 0
					? (attachments[0] as unknown as APIAttachment)
					: null

			if (!attachment) {
				interaction.reply({
					content:
						"Picasso can only scale pixel art on messages that have an image attached.",
					ephemeral: true,
				})
			} else if (typeof attachment === "string") {
				interaction.reply({
					content: "Could not fetch attachment.",
					ephemeral: true,
				})
			} else if (attachment.proxy_url.endsWith(".gif")) {
				interaction.reply({
					content:
						"Picasso can not scale GIFs yet. Please upload a PNG or JPG still image.",
					ephemeral: true,
				})
			} else if (!/\.(png|jpg|jpeg)$/.test(attachment.proxy_url)) {
				interaction.reply({
					content: "Attachments must be a PNG or JPG image.",
					ephemeral: true,
				})
			} else {
				interaction.reply({
					// TODO : scale image and send as attachment
					content: "scaled content goes here",
				})
			}
		}
	}
})

// log in client
client.login(process.env.bottoken)
