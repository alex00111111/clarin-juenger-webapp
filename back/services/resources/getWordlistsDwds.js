var Q = require('q');
var fs = require('fs');
var crypto = require('crypto');

exports.getWordlistsDwds = function (params, tunnel, qRequest) {
    return (function () {
        return tunnel.qConnect()
            .then(function () {
                var chain = Q(),
                    baseUrl = "http://kaskade.dwds.de/dstar/kern/query?q=",
                    yMin = 1919,
                    yMax = 1933,
                    predicates = ['Zeitung', 'Belletristik', 'Wissenschaft', 'Gebrauchsliteratur'],
                    sliceSize = 1000,
                    maxSize = 1000000,
                    timeoutInterval = 10*1000,
                    lHash = "",
                    expectedMatches = 10000000;
                // timeoutEach = 5000;

                for (var y = yMin; y <= yMax; y++) {
                    predicates.forEach(function (p) {
                        for (var i = 0; i <= maxSize - sliceSize; i += sliceSize) {
                            var url = baseUrl + encodeURIComponent("* #has[textClass,/^" + p + "/] #asc_date[" + y + "-00-00, " + y + "-99-99]")+"&limit="+(sliceSize)+"&start="+(i+1);
                            console.log("chaining " + url);
                            chain = chain.then(retrieveText.bind(null, url, p))
                        }
                    })
                }

                return chain;

                function retrieveText (url, p) {
                    console.log("retrieving: " + url);

                    if (expectedMatches < url.substring(url.lastIndexOf('=')+1)) {
                        console.log('skipping... (nhits < start)');
                        return Q();
                    }

                    return Q().then(qRequest.bind(null, url)).then(function (data) {
                        // Extrahiere Klartext
                        // Schreibe in Array dies Objekt: {text: text, titel: titel, date: date, hash: sha1(autor + titel + jahr)}
                        // Wenn Hash schon in Array vorhanden wird text nur angehängt.
                        // Gute Buffered Strategie zum Herausschreiben überlegen; um Speicherverbrauch gering zu halten
                        // Möglichkeit 1: direktes Herausschreiben in Datei mit Hash als Namen; dann einfach concat über alle Dateien.
                        //          Vorteil: Metadaten nur beim ersten Finden eines Titels interessant.
                        // Möglichkeit 2: Wenn Ergebnisse von DWDS bereits geordnet sind wird obiger Ansatz
                        //          trivialerweise zum Anhängen des Textes in eine einzige Datei
                        console.log("retrieved: " + typeof data);
                        data = JSON.parse(data);
                        console.log("transformed: " + typeof data);
                        expectedMatches = data.nhits_;
                        console.log("expected total hits: " + data.nhits_);

                        var hits = data.hits_.map(function (hit) {
                            var hash = crypto.createHash('sha1');
                            var meta = {
                                author: hit.meta_.author,
                                title: hit.meta_.title,
                                date: hit.meta_.date_,
                                source: hit.meta_.biblLex
                            };
                            hash.update(JSON.stringify(meta), 'utf8');
                            return {
                                hash: hash.digest('hex'),
                                meta: meta,
                                text: hit.ctx_[1]
                                    .map(function (w) {
                                        return w[1];
                                    }).reduce(function (a, b) {
                                        return a + " " + b;
                                    },"")
                            };
                        });
                        // iteriere durch hits
                        if (hits.length > 0) {
                            var y = hits[0].meta.date.substring(0, hits[0].meta.date.indexOf('-'));
                            var wstream = fs.createWriteStream('../dwds-korpora/' + p + y + '.xml', {
                                flags: "a+"
                            });
                            hits.forEach(function (hit) {
                                if (hit.hash !== lHash) {
                                    // write meta heading
                                    wstream.write('\n <source><location>' + hit.meta.source +
                                    '</location><date>' + hit.meta.date + '</date></source>\n');
                                }
                                //append text
                                wstream.write(hit.text);
                                lHash = hit.hash;
                            });
                            wstream.end();
                        }
                        return Q().delay(timeoutInterval);
                    }).fail(function (error) {
                        console.log("error:" + error);
                    });
                }

            });
    });

};