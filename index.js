'use strict'
const { promises: {readFile} } = require("fs")

class Handler {
  constructor({rekoSvc}) {
    this.rekoSvc = rekoSvc
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

  async main(event) {
    try {
      const imgBuffer = await readFile('./images/cat.jpeg')
      const { names, workingItems } = await this.detectImageLabels(imgBuffer)
      return {
        names, workingItems
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
const rekognition = new aws.Rekognition()

const handler = new Handler({
  rekoSvc: rekognition,
})

module.exports.main = handler.main.bind(handler)