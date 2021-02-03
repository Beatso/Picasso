const dotenv = require("dotenv")
const Discord = require("discord.js")
const scalePixelArt = require("scale-pixel-art")
const request = require("request").defaults({ encoding: null })

dotenv.config()

const client = new Discord.Client()

client.once("ready", () => {
	console.log("bot running");
	(function startUpdatingStatus () {
		client.user.setActivity(`${client.guilds.cache.size} servers`, { type: 'WATCHING' }).catch(console.error) // update status
		setTimeout(() => startUpdatingStatus(), 3600000) // run again in an hour
	})()
})
client.login(process.env.bottoken)

client.on("message", message => {
	
	if (
		!message.content.includes(`<@${client.user.id}>`) &&
		!message.content.includes(`<@!${client.user.id}>`)
	) return

	if (message.author.bot) return

	var inputAttachment
	
	if (message.reference) inputAttachment = message.referencedMessage.attachments.first()
	else inputAttachment = message.attachments.first()

	if (inputAttachment==undefined) {
		message.channel.send("There was no attachment on that message.\nPing me in a message with an image, or ping the bot in a reply to an image to scale it.")
		return
	}

	const inputAttachmentURL = inputAttachment.url

	request.get(inputAttachmentURL, (err, res, inputBuffer) => {
		
		const scaleFactor = Math.floor(512 / Math.min(inputAttachment.width, inputAttachment.height))
		scalePixelArt(inputBuffer, scaleFactor)
			.then(outputBuffer => {
				const outputAttachment = new Discord.MessageAttachment(outputBuffer, "response.png")
				if (Buffer.byteLength(outputBuffer) <= 8000000) {
					message.channel.send(outputAttachment)
						.catch(error => message.channel.send(`Sending the scaled image failed for the following reason:\n\`${error}\``))
				} else message.channel.send("Could not send the scaled image because the file size was too big.")
			})
			.catch(error => message.channel.send(`Scaling the image failed for the following reason:\n\`${error}\``))
		
	})
	
})
