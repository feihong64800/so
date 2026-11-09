// 访问统计公共模块
// 用法：先引入 config.js（提供 CONFIG.BASE_URL），再引入本文件，然后调用 reportVisit('页面名')
// 渠道判断全部放在这里，页面只需要传一个页面名，比如 reportVisit('淘客制衣')

function reportVisit(pageName) {
    try {
        var src = getVisitSrc();
        var visitor = getVisitType();
        var device = isMobileDevice() ? '手机' : '电脑';
        var page = (pageName || '未知页面').toString().slice(0, 10);

        var name = page + '|' + src + '|' + visitor + '|' + device;

        fetch(CONFIG.BASE_URL + '/model/stats.php?name=' + encodeURIComponent(name))
            .catch(function () {});
    } catch (e) {
        // 上报失败不能影响页面加载
    }
}

// 渠道判断：只信 referrer，三种情况
// 1. referrer 为空 -> 直接输入（手输网址、书签、App 清掉 referrer、HTTPS 降级跳转）
// 2. referrer 合法 -> 原样记 hostname（小写、含 www、不截断）
//    站内还是站外不用代码翻译，日志里看到自己的域名一眼便知
// 3. referrer 畸形（new URL 抛错）-> 异常referrer，和"没有 referrer"区分开，便于排查
function getVisitSrc() {
    let src = '';
    try {
        src = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : '直接输入';
    } catch (e) {
        src = '异常referrer';
    }
    return src;
}

// 设备判断：用 Chromium 的 userAgentData，不支持时回落到 UA 正则
function isMobileDevice() {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
        return navigator.userAgentData.mobile;
    }
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
}

// 新老访客：只认 cookie，token 只生成一次
// 第 1 次访问返回 new:user 并把 user 写进 cookie，第 2 次起直接返回 user
// domain 由 getShareDomain 运行时算出来，同一份代码在 yulinlin.cn 家族共享、在 github.io 退回完整 hostname
function getVisitType() {
    var key = 'yulinlin_visited';
    var m = document.cookie.match(new RegExp('(?:^|; )' + key + '=([^;]*)'));

    if (m && m[1]) {
        return m[1];
    }

    var token = 'yulinlin' + Math.random().toString(36).slice(2, 8);
    var domain = getShareDomain(location.hostname);

    document.cookie = key + '=' + token + '; path=/; domain=' + domain + '; max-age=31536000; SameSite=Lax';

    return 'new:' + token;
}

// 共享域：去掉第一段取父域，让 yulinlin.cn / www / so / books 用同一个 cookie
// github.io 是公共后缀，写父域会被浏览器忽略，所以退回完整 hostname，效果等同不写 domain，只为代码统一
function getShareDomain(host) {
    if (!host) {
        return '';
    }

    if (/^[0-9.]+$/.test(host) || host === 'localhost') {
        return host;
    }

    var parts = host.split('.');

    if (parts.length < 2) {
        return host;
    }

    if (host.slice(-10) === '.github.io') {
        return host;
    }

    return parts.slice(1).join('.');
}