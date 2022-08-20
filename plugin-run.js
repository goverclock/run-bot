"use strict"
const { segment } = require("oicq");
const { join } = require("path");
const { send } = require("process");
const { bot } = require("./index")

/**
 * {
 *   user_id: 123456789,
 *   nickname: 谢尔顿,
 *   last_run: Date,
 *   run_count: 2,
 *   ...break... 
 * }
 */

let joined_users = [];

function user_join(sender) {
    let date = new Date();
    date.setHours(date.getHours() + 2);
    date.setHours(date.getHours() + 24);
    sender.last_run = new Date();  // 1970-01-01 00:00:00
    sender.run_count = 0;
    joined_users.push(sender);
};

// #加入
bot.on("message.group", function (msg) {
    if (msg.raw_message !== "#加入") return;

    msg.reply(msg.sender.nickname + " 加入了跑步计划.", true);
    user_join(msg.sender);
});

// #查询
bot.on("message.group", function (msg) {
    if (msg.raw_message !== "#查询") return;

    let rep = "排行榜\n";
    rep += "\t名称\t距上次\t总次数\n"
    let rank = 0;
    for (let i of joined_users) {
        rank++;
        console.log((Date.now() - i.last_run));
        let ms = (Date.now() - i.last_run);
        let interval = String(Math.floor(ms / 86400000)) + "天" + String(Math.floor((ms % 86400000) / 3600000)) + "小时";
        console.log(interval)
        rep += rank + ". " + i.nickname + " " + interval + " " + i.run_count + "\n";
    }
    msg.reply(rep, false);
});

// 读写存储数据,持久化