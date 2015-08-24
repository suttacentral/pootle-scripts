

(function(){


function getScripts(scripts) {
    var promises = [];
    
    scripts.forEach(function(script) {
        promises.push(jQuery.getScript(script));
    })
    
    return jQuery.when.apply(promises);
}

/* Perform human sorting
 * This crude implementation pads all numbers to 6 digits long
 * as such it will break down for numbers larger than 999999
 * for normal filenames based on numbers humans normally relate
 * to this is not going to be a problem.
 */
function zfill(num) {
    // jsperf indicates this is generally the fasted way to zfill
    // presumably because function calls are harder to optimize.
    while (num.length < 6) {
        num = '0' + num
    }
    return num
}

sorttable.sort_alpha = function(a,b) {
    var left = a[0].replace(/\d+/g, zfill),
        right = b[0].replace(/\d+/g, zfill);
    
    if (left==right) return 0;
    if (left<right) return -1;
    return 1;
};

  /* Copies source text(s) into the target textarea(s)*/
window.PTL.editor.copyOriginal = function (sources) {
    var cleanSources = [];
    $.each(sources, function (i) {
      cleanSources[i] = $(this).text();
    });

    var targets = $("[id^=id_target_f_]");
    if (targets.length) {
      var i, active,
          max = cleanSources.length - 1;

      for (var i=0; i<targets.length; i++) {
        var newval = cleanSources[i] || cleanSources[max];
        $(targets.get(i)).val(newval);
      }

      // Focus on the first textarea
      active = $(targets).get(0);
      active.focus();
      /* Should we make this fuzzy? */
      
      var text = $('<div>' + newval + '</div>').text().trim();
      text = $('<div>' + text + '</div>').text().trim()
      if (text.search(/[a-zA-Zāīōū]/) != -1) {
          // Make this fuzzy
          PTL.editor.goFuzzy();
      }
      // Place cursor at start of target text
      PTL.editor.cpRE.exec($(active).val());
      i = PTL.editor.cpRE.lastIndex;
      $(active).caret(i, i);
      PTL.editor.cpRE.lastIndex = 0;
    }
}

/* Automatically convert ascii punctuation to unicode */
function unicodeify(e) {
    var element = $(e.target),
        text = element.val(),
        caret = element.caret();
    var newtext = text.replace(/(^| )"/g, '$1“')
               .replace(/([^ ])"/g, '$1”')
               .replace(/(^| )'/g, '$1‘')
               .replace(/([^ ])'/g, '$1’');
    if (newtext != text) {
        element.val(newtext);
        element.caret(caret);
    }
}

$(document).on('change keyup', 'textarea.translation', unicodeify);


var loaded = false;
var promise = null;

$(document).on('editor_ready', function(e) {
    var sidebar = $('.translate-left');
    sidebar.find('#tm').remove();
    
    activatePaliLookup = function() {        
        window.sc = window.sc || {};
        sc.exports = {elasticsearch_api_url: 'http://localhost:9200/'};
        sc.paliLookup.targets = '.translate-focus .translation-text[lang=pi]';
        sc.paliLookup.mouseovertarget = 'body';
        sc.paliLookup.main = 'body'
        
        sc.paliLookup.markupGenerator.excludeFn = function(node) {
            if ($(node.parentNode).is('[class^=highlight]')) return true
            return false
        }
        sc.paliLookup.activate();
        sc.popup.clear()
    }
    
    activateGlossary = function() {
        var tmPanel = $('<div id="tm" class="sidebar" dir="ltr">\
            <div class="sidetitle" lang="en-gb">Terminology:</div>\
        </div>');
            
        var tmUnitTmpl = $('<div class="tm-unit js-editor-copytext" title="Insert the translated term into the editor">\
          <span class="tm-original" dir="ltr" lang="pi"></span>\
          <span class="tm-translation" dir="ltr" lang="en"></span>\
        </div>');
        
        var text = $('.translate-focus .translation-text').text();
        if (!sc.paliLookup.glossary.client) {
            return
        }
        sc.paliLookup.glossary.getEntries(text).then(function(resp) {
            var hits = resp.hits.hits;
            hits.sort(function(a, b) {return comparePaliAlphabet(a._source.term, b._source.term)});
            hits.forEach(function(hit) {
                console.log(hit._source);
                var tmUnit = tmUnitTmpl.clone();
                var term = hit._source.term;
                if (hit._source.context) {
                    term += '<span style="font-weight: normal"> (' + hit._source.context + ')</span>';
                }
                tmUnit.find('.tm-original').html(term);
                tmUnit.find('.tm-translation').text(hit._source.gloss);
                tmPanel.append(tmUnit);
            })
            if (tmPanel.children().length > 1) {
                sidebar.append(tmPanel);
            }
        })
    }
    
    var dev = false;
    
    if ($('.translation-text[lang=pi]').length) {
        if (!promise) {
            if (dev) {
                $(document.body).append('\
                <script src="http://localhost/js/vendor/elasticsearch-5.0.0.js"></script>\
                <script src="http://localhost/js/lib/text-nodes.js"></script>\
                <script src="http://localhost/js/lib/pali-sort.js"></script>\
                <script src="http://localhost/js/lib/sorted-stringify.js"></script>\
                <script src="http://localhost/js/sc_popup.js"></script>\
                <script src="http://localhost/js/paliLookup2.0.js"></script>\
                <link rel="stylesheet" href="http://localhost/css/compiled/paliLookup2.2-standalone.css">');
                promise = $.Deferred();
                _.delay(function(){promise.resolve()}, 200);
            } else {
                promise = $.ajax({
                    url: "/assets/js/paliLookup2.2-standalone.js",
                    dataType: "script",
                    cache: true});
                $(document.body).append('<link rel="stylesheet" href="/assets/css/paliLookup2.2-standalone.css">');
            }
            
        }
        

        promise.then(activatePaliLookup)
               .then(activateGlossary);
    }
    
    /* Shortcuts */
    var currentIndex = parseInt($('#item-number').val(), 10),
        maxIndex = parseInt($('#items-count').text(), 10);
    
    // Create a version of gotoIndex which can only be calld once
    // otherwise extreme problems occur if the keyboard shortcut is
    // invoked more than once.
    var gotoIndex = _.once(_.bind(PTL.editor.gotoIndex, PTL.editor));
    
    shortcut.add('ctrl+shift+up', function(e) {
        gotoIndex(Math.max(1, currentIndex - 10));
    });
    
    shortcut.add('ctrl+shift+down', function(e) {
        gotoIndex(Math.min(currentIndex + 10, maxIndex));
    });
    
    shortcut.add('shift+pageup', function(e) {
        gotoIndex(1);
    });
    shortcut.add('shift+pagedown', function(e) {
        gotoIndex(maxIndex);
    });
    
    // Rebind ctrl+shift+n
    shortcut.add('ctrl+shift+g', shortcut.all_shortcuts["ctrl+shift+n"].callback);
    
    // Copy Original
    
    shortcut.add('alt+down', function() {
      $('.js-copyoriginal').click()
    });
    shortcut.add('ctrl+b', function() {
      $('.js-copyoriginal').click()
    });
});


function addAcceptShortcut() {
    // Accept TM suggestion
    var TMSuggestions = $('[id^=tm] .js-editor-copytext').has('.suggestion-translation'),
        TMSuggestionPlace = 0,
        resetTimeout;
        
    console.log('Suggestions: ', TMSuggestions.length);

    if (TMSuggestions.length > 0) {
        shortcut.add('ctrl+m', function() {
            var suggestion = TMSuggestions[TMSuggestionPlace];
            TMSuggestionPlace += 1;
            TMSuggestionPlace %= TMSuggestions.length;
            $(suggestion).click().css('background', '#fff');
            setTimeout(function(){$(suggestion).css('background', "")}, 150);
        });
        if (resetTimeout != null) clearTimeout(resetTimeout);
        resetTimeout = setTimeout(function(){TMSuggestionPlace = 0}, 9000);
    }
}

function cleanText(text) {
    // Remove variant notes and other span classes
    text = text.replace(/<span[^>]+class=\\?"(?:var|cross|dquo|squo|gatn|brnum)\\?"[^>]+>([^>]+)<\/span>/ig, "$1");
    // Remove anchors
    text = text.replace(/<a[^>]+>([^<]+)<\/a>/ig, "$1");
    return text
}
/* Gets TM suggestions from amaGama */
  PTL.editor.getTMUnits = _.bind(function () {
    var unit = this.units.getCurrent(),
        store = unit.get('store'),
        src = store.get('source_lang'),
        tgt = store.get('target_lang'),
        sText = cleanText(unit.get('source')[0]),
        pStyle = store.get('project_style'),
        tmUrl = this.settings.tmUrl + src + "/" + tgt +
          "/unit/?source=" + encodeURIComponent(sText) + "&jsoncallback=?";
    console.log('Source Text ', sText);
    if (!sText.length) {
        // No use in looking up an empty string
        return;
    }

    if (pStyle.length && pStyle != "standard") {
        tmUrl += '&style=' + pStyle;
    }

    // Always abort previous requests so we only get results for the
    // current unit
    if (this.tmReq != null) {
      this.tmReq.abort();
    }

    this.tmReq = $.jsonp({
      url: tmUrl,
      callback: '_jsonp' + PTL.editor.units.getCurrent().id,
      dataType: 'jsonp',
      cache: true,
      success: function (data) {
        var uid = this.callback.slice(6);

        if (uid == PTL.editor.units.getCurrent().id && data.length) {
          var filtered = PTL.editor.filterTMResults(data),
              name = gettext("Similar translations"),
              tm = PTL.editor.tmpl.tm({store: store.toJSON(),
                                       suggs: filtered,
                                       name: name});

          $(tm).hide().appendTo("#extras-container")
                      .slideDown(1000, 'easeOutQuad');
          addAcceptShortcut();
        }
      },
      error: PTL.editor.error
    });
  }, PTL.editor);


})();
