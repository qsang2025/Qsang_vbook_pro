/**
 * GBK encoding helper for legacy Chinese websites in vBook (Rhino ES6 runtime).
 * Attribution: Adapted from vBook community implementations (hajljnopera, TuanHai03, seyah24).
 * Runtime constraint: Rhino ES6 only (var, function, no arrow functions, no async/await).
 */
var GBK = (function () {
    var data = "%uA1A1%u3000%uA1A2%u3001%uA1A3%u3002%uA1A4%u00B7%uA1A5%u02C9%uA1A6%u02C7" +
        "%uA1A7%u00A8%uA1A8%u3003%uA1A9%u3005%uA1AA%u2015%uA1AB%u2014%uA1AC%uFF5E" +
        "%uA1AD%u2016%uA1AE%u2026%uA1AF%u2018%uA1B0%u2019%uA1B1%u201C%uA1B2%u201D" +
        "%uA1B3%u3014%uA1B4%u3015%uA1B5%u3010%uA1B6%u3011%uA1B7%u3008%uA1B8%u3009" +
        "%uA1B9%u300A%uA1BA%u300B%uA1BB%u300C%uA1BC%u300D%uA1BD%u300E%uA1BE%u300F" +
        "%uA1BF%u3016%uA1C0%u3017%uA1C1%u3012%uA1C2%uFE4F%uA1C3%uFE44%uA1C4%uFE43" +
        "%uA1C5%uFE42%uA1C6%uFE41%uA1C7%u2033%uA1C8%u2032%uA1C9%u2035%uA1CA%u2103" +
        "%uA1CB%uFF04%uA1CC%uFF05%uA1CD%uFF03%uA1CE%uFF06%uA1CF%uFF0A%uA1D0%uFF20" +
        "%uA1D1%uFF08%uA1D2%uFF09%uA1D3%uFF0B%uA1D4%uFF0D%uA1D5%uFF1D%uA1D6%uFF1C" +
        "%uA1D7%uFF1E%uA1D8%uFF0F%uA1D9%uFF3C%uA1DA%uFF5E%uA1DB%uFFE5";

    var U2Ghash = {};
    var G2Uhash = {};

    (function (hexData) {
        var k = 0;
        var matches = hexData.match(/%u[0-9A-Fa-f]{4}/g);
        if (!matches) return;
        for (var i = 0x81; i <= 0xfe; i++) {
            for (var j = 0x40; j <= 0xfe; j++) {
                if (j === 0x7f) continue;
                if (k < matches.length) {
                    var uChar = unescape(matches[k++]);
                    var gHex = ("%" + i.toString(16) + "%" + j.toString(16)).toUpperCase();
                    U2Ghash[uChar] = gHex;
                    G2Uhash[gHex] = uChar;
                }
            }
        }
    })(data);

    function isAscii(code) {
        return (code >= 0x0000 && code <= 0x007f);
    }

    function encodeURI(str) {
        if (!str) return "";
        var res = "";
        for (var i = 0; i < str.length; i++) {
            var ch = str.charAt(i);
            var code = str.charCodeAt(i);
            if (isAscii(code)) {
                res = res + encodeURIComponent(ch);
            } else if (U2Ghash[ch]) {
                res = res + U2Ghash[ch];
            } else {
                res = res + encodeURIComponent(ch);
            }
        }
        return res;
    }

    return {
        encodeURI: encodeURI
    };
})();
