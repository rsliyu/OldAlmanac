(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OldAlmanacPlay = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'old-almanac:daily-play:v1';
  const DAY_MS = 86400000;
  const themes = Object.freeze([
    { id: 'free', label: '随心', hint: '给今天一点灵感' },
    { id: 'focus', label: '专注', hint: '把心放在一件事上' },
    { id: 'rest', label: '松弛', hint: '慢一点也很好' },
    { id: 'connect', label: '相聚', hint: '把温柔留给彼此' },
  ]);

  // 原创生活签。日期和主题固定结果，不需要服务器或随机状态。
  const signs = {
    free: [
      ['花开有时', '且把清风收袖里', '莫催枝上第一花', '不用把今天填满。留一点空白，也许会遇见意料之外的好事。'],
      ['小路有光', '惯走长街寻旧景', '偶行小巷见新春', '给日常换一个小小的走法：一条新路线，一首没听过的歌。'],
      ['此刻正好', '一盏清茶温旧日', '半窗晴色是今朝', '挑一件眼前的小事认真享受，今天就有了值得记住的片刻。'],
      ['心有回响', '微风不语穿林过', '自有枝头应一声', '把一个模糊的念头写下来。它不必成熟，先让它有个落脚处。'],
      ['顺水行舟', '不向急流争一步', '轻舟自有到时风', '今天试着少赶一个进度，多看一眼沿途。你的步调也很重要。'],
      ['拾得小欢', '人间好景寻常在', '一叶一花皆可收', '找一件让你微笑的小事，把它记在今天的末尾。'],
    ],
    focus: [
      ['落笔成山', '一纸未成先落笔', '千山走尽始于行', '把大任务缩成一个十分钟能开始的动作，先做第一步。'],
      ['心定风轻', '窗外千声随雨去', '案前一事待心专', '暂时关掉一个打扰你的通知，为手头的事留一段完整时间。'],
      ['缓缓有成', '细水长流穿石隙', '微光日日照书笺', '不用一次做完。完成一个清楚的小段落，也是一份进展。'],
      ['留白见章', '删去繁枝生秀色', '留将一笔见精神', '从待办里选出最重要的一件，给它今天最清醒的时刻。'],
      ['收好尾声', '书到末行须落款', '事成一处再添新', '先把一件接近完成的事收好尾，再开启新的任务。'],
      ['向前一寸', '不计山高云几重', '只看脚下一寸程', '记下今天已经推进的部分，别让未完成的事遮住你的努力。'],
    ],
    rest: [
      ['宜慢半拍', '日影移窗无急意', '闲云过岭不争先', '放松肩膀，慢慢喝一杯水。给自己一个不用赶路的片刻。'],
      ['歇处生花', '暂把行囊安石上', '回看山色已成诗', '休息也可以写进计划。为今天留五分钟，只做让你舒适的事。'],
      ['松风入怀', '心事轻轻随叶落', '松风缓缓入衣来', '写下一个可以晚点再想的问题，今天先让心轻一点。'],
      ['夜有归处', '收尽白日纷纷意', '留灯一盏待人归', '给今晚安排一个温柔的收尾：整理床边，或早点放下手机。'],
      ['听雨无事', '屋檐滴雨声声缓', '心底浮尘点点清', '静静听一首歌，不切换页面，不同时做别的事。'],
      ['身心有余', '碗中留暖茶留香', '一日从容亦有光', '为自己做一个简单的舒服选择。照顾好此刻，也算完成一件事。'],
    ],
    connect: [
      ['一言暖春', '不必长篇说心意', '寻常一句也生春', '给想到的人发一句具体的问候，分享你今天看到的小事。'],
      ['好好听见', '半句未完先停步', '一心相待胜千言', '下一次聊天时，试着先听完，再回应。留一点空间给对方。'],
      ['同桌有味', '粗茶淡饭围炉坐', '笑语三声胜盛筵', '和熟悉的人约一个简单的相处时刻，不必安排得很隆重。'],
      ['谢意成笺', '旧日微光犹在手', '今朝一谢寄君知', '想起一件被别人照顾过的小事，认真说一句谢谢。'],
      ['远近皆暖', '两地月明同一色', '数行字短亦相亲', '把一张照片或一段近况分享给久未联系的人，让距离短一点。'],
      ['善意同行', '行路相逢添笑意', '人间微暖自相传', '今天送出一个小小的善意：让一步，帮一把，或夸一句。'],
    ],
  };

  const challenges = [
    ['window', '收集一片天色', '走到窗边或户外，看两分钟天空，记住今天云的样子。', '2 分钟'],
    ['desk', '清出一角桌面', '整理手边一个小角落，只留下此刻需要的东西。', '5 分钟'],
    ['thanks', '寄出一句谢谢', '向一个帮过你的人，说一句具体的感谢。', '3 分钟'],
    ['water', '认真喝一杯水', '放下屏幕，慢慢喝水，顺便让肩膀松下来。', '2 分钟'],
    ['walk', '走一小段新路', '散步时换一个小方向，看看平时略过的风景。', '5 分钟'],
    ['note', '写下今天的小欢喜', '在纸上或备忘录里，记下一件今天让你开心的小事。', '3 分钟'],
    ['song', '完整听一首歌', '选一首喜欢的歌，从头听到尾，给耳朵一段自己的时间。', '5 分钟'],
    ['start', '开始那个小念头', '挑一个一直想做的小事，只完成它最容易的第一步。', '5 分钟'],
    ['hello', '问候一个老朋友', '发一条真诚的近况或问候，想到谁，就从谁开始。', '3 分钟'],
    ['read', '读一页闲书', '翻一页喜欢的书，留下一句此刻想记住的话。', '5 分钟'],
    ['photo', '发现一个小细节', '留意一片叶子、一处光影或一种颜色，给今天留一个画面。', '3 分钟'],
    ['pause', '给自己一段空白', '暂时放下手头的事，舒展身体，安静坐一会儿。', '3 分钟'],
    ['kind', '送出一份小善意', '认真夸奖一个人，或做一件顺手能帮到别人的小事。', '3 分钟'],
    ['close', '收好一件小事', '结束一个拖着的小任务，再给自己说一句：做得不错。', '5 分钟'],
  ];

  function dateNumber(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('日期格式应为 YYYY-MM-DD');
    const [y, m, d] = value.split('-').map(Number);
    const time = Date.UTC(y, m - 1, d);
    if (y < 1900 || y > 2099 || new Date(time).toISOString().slice(0, 10) !== value) throw new RangeError('日期超出范围或不存在');
    return time / DAY_MS;
  }

  function shiftDate(value, days) {
    return new Date((dateNumber(value) + days) * DAY_MS).toISOString().slice(0, 10);
  }

  function todayCN(now = new Date()) {
    // 上海不使用夏令时；加八小时后读取 UTC 日期，不受设备时区影响。
    return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
  }

  function hash(value) {
    let result = 2166136261;
    for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
    return result >>> 0;
  }

  function signFor(date, theme = 'free') {
    dateNumber(date);
    if (!themes.some((item) => item.id === theme)) throw new RangeError('未知签文主题');
    const index = hash('daily-sign:v1:' + date + ':' + theme) % signs[theme].length;
    const [title, first, second, note] = signs[theme][index];
    return { date, theme, number: String(themes.findIndex((item) => item.id === theme) * 6 + index + 1).padStart(2, '0'), title, lines: [first, second], note };
  }

  function challengeFor(date) {
    const index = ((dateNumber(date) % challenges.length) + challenges.length) % challenges.length;
    const [id, title, description, duration] = challenges[index];
    return { id, title, description, duration };
  }

  function cleanDates(dates, today) {
    const valid = (Array.isArray(dates) ? dates : []).filter((date) => {
      try { dateNumber(date); return date <= today; } catch { return false; }
    });
    return [...new Set(valid)].sort();
  }

  function createStampStore(storage, initialToday = todayCN()) {
    let dates = [];
    let persistent = !!storage;
    function read(today) {
      if (!persistent) return [];
      try {
        const raw = storage.getItem(STORAGE_KEY);
        let record;
        try { record = JSON.parse(raw); } catch { return []; }
        return record && record.version === 1 ? cleanDates(record.stamps, today) : [];
      } catch {
        persistent = false;
        return [];
      }
    }
    dates = read(initialToday);
    return {
      get persistent() { return persistent; },
      getDates() { return dates.slice(); },
      reload(today = todayCN()) {
        // 合并当前页面记录；写入失败时仍然保留会话中的盖章。
        dates = cleanDates([...dates, ...read(today)], today);
      },
      stamp(date, today = todayCN()) {
        dateNumber(date);
        dateNumber(today);
        this.reload(today);
        if (date !== today) return { kind: 'readonly', persistent };
        if (dates.includes(date)) return { kind: 'already', persistent };
        dates = cleanDates([...dates, date], today);
        if (persistent) {
          try { storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, stamps: dates })); }
          catch { persistent = false; }
        }
        return { kind: 'added', persistent };
      },
    };
  }

  function statsFor(records, today = todayCN()) {
    const dates = cleanDates(records, today);
    const present = new Set(dates);
    const todayNumber = dateNumber(today);
    let cursor = todayNumber - (present.has(today) ? 0 : 1);
    let streak = 0;
    // 数值游标允许在 1900 年第一天之后正常终止。
    while (present.has(new Date(cursor * DAY_MS).toISOString().slice(0, 10))) { streak++; cursor--; }
    const week = Array.from({ length: 7 }, (_, i) => {
      const date = new Date((todayNumber - 6 + i) * DAY_MS).toISOString().slice(0, 10);
      return { date, stamped: present.has(date), today: date === today };
    });
    return { total: dates.length, streak, week };
  }

  return { STORAGE_KEY, themes, signFor, challengeFor, todayCN, shiftDate, createStampStore, statsFor };
});
