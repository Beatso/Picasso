// imports
const dotenv = require("dotenv")
const Discord = require("discord.js")
const Jimp = require('jimp')

dotenv.config()

const client = new Discord.Client()

client.once("ready", () => {
	console.log("bot running");
	(function startUpdatingStatus () {
		client.user.setActivity(`@Picasso | ${client.guilds.cache.size} servers`, { type: 'WATCHING' }).catch(console.error) // update status
		setTimeout(() => startUpdatingStatus(), 3600000) // run again in an hour
	})()
})
client.login(process.env.bottoken)

client.on("message", async message => {
	
	if (
		!message.content.includes(`<@${client.user.id}>`) &&
		!message.content.includes(`<@!${client.user.id}>`)
	) return

	if (message.author.bot) return

	const inputAttachment = message.reference
		? message.referencedMessage.attachments.first()
		: message.attachments.first()

	if (!inputAttachment)
		return message.channel.send("There was no attachment on that message.\nMention me in a message with an image, or mention me in a reply to an image to scale it.\nFind more info about the bot here: <https://github.com/Beatso/Picasso>")

	try {

		const image = await Jimp.read(inputAttachment.url)

		image.scaleToFit(512, 512, Jimp.RESIZE_NEAREST_NEIGHBOR)

		const outputBuffer = await image.getBufferAsync(image.getMIME())

		if (Buffer.byteLength(outputBuffer) <= 8000000)
			message.channel.send(new Discord.MessageAttachment(outputBuffer, inputAttachment.name))
		else message.channel.send("Could not send the scaled image because the file size was too large.")


	} catch (error) {
		message.channel.send('There was an error scaling that image.')
		console.error(error)
	}

	
})
