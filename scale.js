const sharp = require("sharp")

const scaleImage = async input => {
	
	try {
		const image = sharp(input)
		const metadata = await image.metadata()
		const output = await image
			.resize ( metadata.width*20, null, { kernel: "nearest" })
			.toBuffer()
		return output
	}
	
	catch (error) {
		throw error
	}

}

module.exports = scaleImage
