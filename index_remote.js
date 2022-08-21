"use strict"
const { createClient } = require("oicq")

const account = 0

const bot = createClient(account)

let client = bot;
client.on("system.login.slider", function (e) {
	console.log("输入ticket：")
	process.stdin.once("data", ticket => this.submitSlider(String(ticket).trim()))
  }).login("password")

exports.bot = bot

require("./plugin-run")

process.on("unhandledRejection", (reason, promise) => {
	console.log('Unhandled Rejection at:', promise, 'reason:', reason)
})
