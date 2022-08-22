"use strict"
const { createClient } = require("oicq")

const account = 0

const bot = createClient(account)

let client = bot;
client.on("system.login.slider", function (e) {
	console.log("输入ticket：")
	process.stdin.once("data", ticket => this.submitSlider(String(ticket).trim()))
  }).login("password")	// 注意下面一处的"password"也需要替换

// 为了防止不小心登陆了bot帐号而把服务器踢下线,下面的代码使服务器被踢时自动重新登陆
client.on("system.offline.kickoff", function (e) {
	client.login("password");
})

exports.bot = bot

require("./plugin-run")

process.on("unhandledRejection", (reason, promise) => {
	console.log('Unhandled Rejection at:', promise, 'reason:', reason)
})
