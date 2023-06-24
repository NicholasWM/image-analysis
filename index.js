'use strict'
const { get } = require('axios')
const { promises: {readFile} } = require("fs")

class Handler {
  constructor({rekoSvc, translatorSvc}) {
    this.rekoSvc = rekoSvc
    this.translatorSvc = translatorSvc
  }

  async translateText(text) {
    const params = {
      SourceLanguageCode: 'en',
      TargetLanguageCode: 'pt',
      Text: text
    }

    const { TranslatedText } = await this.translatorSvc.translateText(params).promise()

    return TranslatedText.split(' e ')
  }

  async detectImageLabels(buffer) {
    const result = await this.rekoSvc.detectLabels({
      Image: {
        Bytes: buffer
      }
    }).promise()

    const workingItems = result.Labels.filter(({Confidence}) => Confidence > 80)

    const names = workingItems.map(({Name}) => Name).join(' and ')

    return {names, workingItems}
  }

  formatTextResults(texts, workingItems) {
    const finalText = []
    for(const indexText in texts) {
      const nameInPortuguese = texts[indexText]
      const confidence = workingItems[indexText].Confidence
      finalText.push(
        `${confidence.toFixed(2)}% de ser do tipo ${nameInPortuguese}`
      )
    }

    return finalText.join('\n')
  }

  async getImageBuffer(imageUrl) {
    const response = await get(imageUrl, {
      responseType: 'arraybuffer'
    })

    const buffer = Buffer.from(response.data, 'base64')

    return buffer
  }

  async main(event) {
    try {
      const { imageUrl } = event.queryStringParameters
      // const imgBuffer = await readFile('./images/cat.jpeg')
      const imgBuffer = await this.getImageBuffer(imageUrl)
      const { names, workingItems } = await this.detectImageLabels(imgBuffer)
      const texts = await this.translateText(names)

      const finalText = this.formatTextResults(texts, workingItems)

      return {
        statusCode: 200,
        body: `A imagem tem\n`.concat(finalText)
      }
    } catch (error) {
      console.log('Error***', error?.stack || error)
      return {
        statusCode: 500,
        body: 'Internal Server Error'
      }
    }
  }
}

const aws = require('aws-sdk')
const translator = new aws.Translate()
const rekognition = new aws.Rekognition()

const handler = new Handler({
  rekoSvc: rekognition,
  translatorSvc: translator
})

module.exports.main = handler.main.bind(handler)