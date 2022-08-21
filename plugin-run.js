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
 *   reminder: null
 *   ...break... 
 * }
 */

let joined_users = [];
let group_id = null;


bot.on("system.online", timing_reminder);

// #加入
// 顺便获取一下群号
bot.on("message.group", function (msg) {
    if (msg.raw_message !== "#加入") return;
    group_id = msg.group_id;
    user_join(msg);
});

// #退出
bot.on("message.group", function (msg) {
    if (msg.raw_message !== "#退出") return;
    msg.reply("为了让你坚持下去,退出是被禁止的.");
});

// #查询
// TODO: sort by last time
bot.on("message.group", function (msg) {
    if (msg.raw_message !== "#查询") return;

    let rep = "排行榜\n";
    rep += "\t名称\t\t距上次\t总次数\n"
    let rank = 0;
    for (let i of joined_users) {
        rank++;
        let cur_date = new Date();
        let ms = cur_date - i.last_run;
        let interval = String(Math.floor(ms / 86400000)) + "天" + String(Math.floor((ms % 86400000) / 3600000)) + "小时";
        rep += rank + ". " + i.nickname + " " + interval + " " + i.run_count + "\n";
    }
    msg.reply(rep, false);
});

// #跑完了
bot.on("message.group", function (msg) {
    if (msg.raw_message !== "#跑完了") return;

    let user = joined_users.find(item => item.user_id === msg.sender.user_id);
    user.last_run = new Date();
    user.run_count++;
    msg.reply(`你已经成功跑步${user.run_count}次!`, true);
});

// #定时 时:分
bot.on("message.group", function (msg) {
    if (msg.raw_message.indexOf("#定时") === -1) return;
    if (!is_joined(msg)) {
        msg.reply("需要先\"#加入\"才能使用此功能.", true);
        return;
    }

    // 获取 时:分
    let m = msg.raw_message;
    let ind1 = m.indexOf(" ");
    let ind2 = m.indexOf(":");
    if (ind2 === -1) ind2 = m.indexOf("：");
    let hour = +m.slice(ind1 + 1, ind2);
    let min = +m.slice(ind2 + 1);

    let user = joined_users.find(item => item.user_id === msg.sender.user_id);
    // 未给出或给出了错误的时间格式,取消定时
    if (ind1 === -1 || ind2 === -1) {
        user.reminder = null;
        msg.reply("已取消定时提醒.", true);
    } else {
        user.reminder = [hour, min];
        msg.reply(`已设置为每天${hour}:${min}提醒你跑步.`, true);
    }
});

// #帮助
bot.on("message.group", function (msg) {
    if (msg.raw_message !== "#帮助") return;

    msg.reply("跑步bot使用指南:",
        "..."
    );

});

function is_joined(msg) {
    let sender = msg.sender;
    for (let i of joined_users)
        if (i.nickname === sender.nickname)
            return true;
    return false;
}

function user_join(msg) {
    if (is_joined(msg)) {
        msg.reply(msg.sender.nickname + " 你已经加入过了.", true);
        return;
    }

    let sender = msg.sender;
    let date = new Date();
    // TODO: debug last_run
    date.setHours(date.getHours() - 23);
    // **********
    sender.last_run = date;
    sender.run_count = 0;
    sender.reminder = null;
    joined_users.push(sender);

    msg.reply(sender.nickname + " 加入了跑步计划.", true);
};

function timing_reminder() {
    // console.log("timing_reminder(): called");
    let cur = new Date();
    let tar = new Date();

    for (let i of joined_users) {
        if (i.reminder === null) continue;
        tar.setHours(i.reminder[0]);
        tar.setMinutes(i.reminder[1]);
        if (tar - cur < 0) tar.setDate(tar.getDate() + 1);

        console.log(tar - cur);
        if (tar - cur === 0) {
            let user = i.user_id;
            let group = bot.pickGroup(group_id);
            const message = [
                segment.at(user),
                " 该去跑跑了!",
            ]
            group.sendMsg(message);
        }
    }

    // 每分钟调用一次
    setTimeout(timing_reminder, 60 * 1000);
}

// 读写存储数据,持久化...


