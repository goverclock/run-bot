"use strict"
const { segment } = require("oicq");
const { join } = require("path");
const { send } = require("process");
const { bot } = require("./index");
let fs = require("fs");

/**
 * {
 *   user_id: 123456789,
 *   nickname: 谢尔顿,
 *   last_run: Date,
 *   run_count: 2,
 *   reminder: null,
 *   break: 0,
 *   gap: 1,
 *   cur_gap: 0
 * }
 */

let joined_users = [];
let group_id = null;

// 启动定时提醒
bot.on("system.online", timing_reminder);

// 每当接收到新消息时,自动保存数据到run_bot.dat
bot.on("message.group", auto_save);

// #save
// 保存到run_bot.dat.bak
// 而非自动保存到的run_bot.dat
bot.on("message.group", function (msg) {
    if (msg.raw_message !== "#save") return;

    console.log("正在手动保存");
    let data = JSON.stringify(joined_users);
    fs.writeFile('run_bot.dat.bak', data, function (err) {
        if (err) {
            return console.error(err);
        }
        console.log("手动保存成功");
    });

    msg.reply(data.toString(), true);
});

// #load
// 载入run_bot.dat.bak文件, 注意:这与#save命令写入的文件不同
bot.on("message.group", function (msg) {
    if (msg.raw_message !== "#load") return;

    fs.readFile('run_bot.dat.bak', function (err, data) {
        if (err) {
            return console.error(err);
        }
        joined_users = JSON.parse(data.toString(), function (key, value) {
            if (key == 'last_run') return new Date(value);
            return value;
        });
    });

    msg.reply("已载入数据.", true);
});

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
bot.on("message.group", function (msg) {
    if (msg.raw_message !== "#查询") return;

    joined_users.sort(function (a, b) {
        let ret = a.last_run - b.last_run;
        if (Math.abs(ret) <= 60 * 60 * 1000) ret = b.run_count - a.run_count;
        return ret;
    });

    let rep = "排行榜\n";
    rep += "\t名称\t\t距上次\t总次数\n"
    let rank = 0;
    for (let i of joined_users) {
        if (rank) rep += "\n";
        rank++;
        let cur_date = new Date();
        let ms = cur_date - i.last_run;
        let interval = String(Math.floor(ms / 86400000)) + "天" + String(Math.floor((ms % 86400000) / 3600000)) + "时";
        if (i.break !== 0) interval = `开摆中(剩余${i.break}次)`;
        rep += rank + ". " + i.nickname + " " + interval + " " + i.run_count;
    }
    msg.reply(rep, false);
});

// #跑完了
bot.on("message.group", function (msg) {
    if (msg.raw_message !== "#跑完了") return;
    if (!is_joined(msg)) {
        msg.reply("需要先\"#加入\"才能使用此功能.", true);
        return;
    }

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
    if (isNaN(hour) || isNaN(min)) {
        user.reminder = null;
        msg.reply("已取消定时提醒.", true);
    } else {
        user.reminder = [hour, min];
        msg.reply(`已设置为每天${hour}:${min}提醒你跑步.`, true);
    }
});

// #间隔 x
// 重置已经过去的间隔(cur_gap),使得今天即提醒
bot.on("message.group", function (msg) {
    if (msg.raw_message.indexOf("#间隔") === -1) return;
    if (!is_joined(msg)) {
        msg.reply("需要先\"#加入\"才能使用此功能.", true);
        return;
    }

    let user = joined_users.find(item => item.user_id === msg.sender.user_id);
    let ind = msg.raw_message.indexOf(" ");
    let x = +msg.raw_message.slice(ind + 1);

    if (isNaN(x) || x === 0) {  // 默认间隔为1
        user.gap = 1;
        msg.reply("已设置为每1天提醒你跑步一次.", true);
    } else {
        user.gap = x;
        msg.reply(`已设置为每${x}天提醒你跑步一次.`, true);
    }
    user.cur_gap = 0;       // 从今天开始跑
});

// #开摆 x
bot.on("message.group", function (msg) {
    if (msg.raw_message.indexOf("#开摆") === -1) return;
    if (!is_joined(msg)) {
        msg.reply("需要先\"#加入\"才能使用此功能.", true);
        return;
    }

    let user = joined_users.find(item => item.user_id === msg.sender.user_id);
    let ind = msg.raw_message.indexOf(" ");
    let x = +msg.raw_message.slice(ind + 1);

    if (isNaN(x) || x === 0) {  // 停止开摆
        user.break = 0;
        user.cur_gap = 0;       // 今日即提醒跑步
        msg.reply("你已停止开摆.", true);
    } else {
        user.break = x;
        msg.reply(`接下来的${x}天你可以开摆.`, true);
    }
});

// #帮助
// TODO: (link)
bot.on("message.group", function (msg) {
    if (msg.raw_message !== "#帮助") return;

    msg.reply("跑步bot使用指南:\n" + "(link).");
});

function is_joined(msg) {
    let sender = msg.sender;
    for (let i of joined_users)
        if (i.user_id === sender.user_id)
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
    sender.last_run = date;
    sender.run_count = 0;
    sender.break = 0;
    sender.reminder = null;
    sender.gap = 1;
    sender.cur_gap = 0;
    joined_users.push(sender);

    msg.reply(sender.nickname + " 加入了跑步计划.", true);
};

function timing_reminder() {
    // console.log("timing_reminder(): called");
    let cur = new Date();
    let tar = new Date();

    for (let i of joined_users) {
        if (i.reminder === null) continue; // 未设置提醒
        tar.setHours(i.reminder[0]);
        tar.setMinutes(i.reminder[1]);
        if (tar - cur < 0) tar.setDate(tar.getDate() + 1);
        if (tar - cur !== 0) continue;

        let group = bot.pickGroup(group_id);
        if (i.break !== 0) {  // 开摆一次
            i.break--;
            i.cur_gap = 0;  // 结束开摆当天即提醒跑步
            continue;
        }

        if (i.cur_gap !== 0) {
            i.cur_gap = (i.cur_gap + 1) % i.gap;
            continue;
        }
        i.cur_gap++;
        const message = [
            segment.at(i.user_id),
            " 该去跑跑了!",
        ]
        group.sendMsg(message);
    }

    // 每分钟调用一次
    setTimeout(timing_reminder, 60 * 1000);
}

// 读写存储数据
function auto_save() {
    let data = JSON.stringify(joined_users);
    fs.writeFile('run_bot.dat', data, function (err) {
        if (err) {
            return console.error(err);
        }
    });
}
