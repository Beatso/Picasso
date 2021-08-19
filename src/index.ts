import { Client, Intents } from "discord.js"
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
})

// log in client
client.login(process.env.bottoken)
