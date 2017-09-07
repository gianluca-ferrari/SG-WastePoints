// ==UserScript==
// @name         SG-WastePoints
// @namespace    gian.scripts
// @version      1.1.beta
// @description  Vote-all button to enter all giveaways on the page (skips faded ga and esgt-hidden giveaways)
// @author       gian raiden
// @include      https://www.steamgifts.com/
// @include      https://www.steamgifts.com/giveaways*
// @include      http://store.steampowered.com/app/*
// @grant        GM_log
// @grant        GM_listValues
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// ==/UserScript==
function addToWishlist(title, appid) {
    try{
        var wishlist = loadWishlist();
        var vett = [];
        if(wishlist.find(function(o){return (o.appid == appid);})){
            return false;
        }
        wishlist.push({'title':title, 'appid':appid});
        saveWishlist(wishlist);
        return true;
    }
    catch(err){
        alert('failed adding game to wishlist: ' + err.message);
        return false;
    }
}

function editSavedWishlist() {
    try{
        var temp = prompt('Edit wishlist: OK to save, Cancel to copy to clipboard current one', '[{"title":"game1","appid":"123"},{"title":"game2","appid":"456"}]');
        if(temp){
            saveWishlist(JSON.parse(temp));
        }
        else{
            //temp == null, cancel pressed
            GM_setClipboard(GM_getValue('wishlist', '[]'), 'wishlist json');
        }
    }
    catch(err){
        alert(err.message);
        return;
    }
}

function saveWishlist(wishlist) {
    GM_setValue('wishlist', JSON.stringify(wishlist));
    console.log(wishlist);
}

function loadWishlist() {
    //var wishlist = '{"games":[{"title":"Luxor HD","appid":361020},{"title":"CSGO","appid":54029},{"title":"7 Wonders","appid":275830}]}';
    return JSON.parse(GM_getValue('wishlist', '[]'));
}

function wastePoints() {
    try{
        var wishlist = loadWishlist();
    }
    catch(err){
        alert('cannot waste points' + err.message);
        return;
    }
    var giveawaysList = [];
    var q = [];
    $('.modal-header').text('Loading ' + wishlist.length + ' games...');
    $('.modal-footer').text('close');
    $('#myModal').css('display', 'block');
    $.each(wishlist, function (i, e) {
        var deferred = new $.Deferred();
        q.push(deferred);
        $.ajax('https://www.steamgifts.com/giveaways/search?app=' + e.appid, {
            complete: function (data, code) {
                $('.modal-body').append('<p>['+ i + '] '+ e.title + ': ' + e.appid + '</p>');
                var giveaways = $(data.responseText).find('.giveaway__row-inner-wrap').not('.pinned-giveaways__outer-wrap .giveaway__row-inner-wrap').not('.is-faded');
                //GM_log(giveaways);
                giveaways.each(function (idx, elem) {
                    var j = $(elem);
                    if (j.find('.giveaway__column--contributor-level').hasClass('giveaway__column--contributor-level--negative')) {
                        return;
                    }
                    gaObj = {
                        "title": "",
                        "url": "",
                        "time": 0
                    };
                    gaObj.url = j.find('.giveaway__heading__name').attr('href');
                    gaObj.time = j.find('.fa-clock-o').next().attr('data-timestamp');
                    gaObj.title = e.title;
                    giveawaysList.push(gaObj);
                });
                deferred.resolve();
            }
        }).fail(function () {
            deferred.fail();
        });
    });
    $.when.apply($, q).then(function () {
        wp_helper(giveawaysList);
    }, function () {
        alert('failed to create list of giveaways');
    });
}

function wp_helper(list) {
    list.sort(function (a, b) {
        return a.time - b.time;
    });

    var q = [];

    list.forEach(function (ga, i , l){
        var deferred = new $.Deferred();
        q.push(deferred);
        enterGiveaway(ga, deferred);
    });

    $.when.apply($, q).then(function () {
        var text = '<table><tr><th>TITLE</th><th>URL</th><th>TIMELEFT</th><th>RESULT</th></tr>';
        list.forEach(function (ga,i,l){
            var seconds = ga.time -(Date.now() / 1000 | 0);
            var hours = Math.floor(seconds / 3600);
            seconds %= 3600;
            var minutes = Math.floor(seconds / 60);
            seconds = seconds % 60;
            text += '<tr><td>' + ga.title + '</td><td><a href="' + ga.url + '">link</a></td><td>' + hours + 'h' + minutes + 'm' + seconds + 's' + '</td><td>' + ga.result + '</td></tr>';
        });
        text += '</table>';
        $('.modal-header').html('RIEPILOGO (' + list.length + ' giveaways)' );
        $('.modal-body').html(text);
        $('.modal-footer').text('close');
        $('#myModal').css('display', 'block');
        console.log(list);
    }, function () {
        alert('failed to enter some giveaways');
    });
}


function enterGiveaway(ga, deferred) {
    $.ajax('https://www.steamgifts.com' + ga.url, {
        complete: function (data, code) {
            ga.result = 'ajax1complete';
            var f = $(data.responseText).find('div[data-do="entry_insert"]').closest('form').serializeArray();
            if (f.length === 0) {
                ga.result = '!ajax_1: no enter button found';
                deferred.resolve();
                return;
            }
            f[1].value = "entry_insert";
            $.ajax('/ajax.php', {
                data: f,
                method: 'POST',
                complete: function (data1, code1) {
                    ga.result = 'ajax2complete';
                    if (data1.responseText === ""){
                        ga.result = 'ajax2empty';
                        deferred.resolve();
                        return;
                    }
                    var d = JSON.parse(data1.responseText);
                    ga.result = d.type;
                    if (d.type === "success") {
                        $('.nav__points').text(d.points);
                    }
                    deferred.resolve();
                    return;
                }
            });
        }
    }); //ajax
}
(function () {
    'use strict';

    if (location.href.startsWith('http://store.steampowered.com/app/')){
        var div = document.createElement('div');
        div.innerHTML= `<a class="btnv6_blue_hoverfade btn_medium" href="#" data-store-tooltip="Add to tampermonkey.steamgiftWishlist">
<span>SG-Wishlist</span>
</a>`;
        document.getElementsByClassName('apphub_HeaderStandardTop')[0].appendChild(div);
        div.onclick = function(){
            var title = document.getElementsByClassName('apphub_AppName')[0].innerHTML;
            var appid = document.getElementsByClassName('glance_tags popular_tags')[0].getAttribute('data-appid');
            console.log(title + ': ' + appid);
            if(addToWishlist(title, appid))
                div.style.backgroundColor = 'mediumseagreen';
            else
                div.style.backgroundColor = 'red';

        };
        return;
    }


    $('body').append('<div id="myModal" class="modal"> <!-- Modal content --> <div class="modal-content"> <div class="modal-header"> <h2>Riepilogo</h2> </div> <div class="modal-body"> </div> <div class="modal-footer"> <h3>Modal Footer</h3> </div> </div></div>');
    $('.modal-footer').click(function(){$('#myModal').css('display','none');});

    $('.modal').css({'display':'none', 'position':'fixed', 'z-index':'1', 'padding-top':'100px', 'left':'0', 'top':'0', 'width':'100%', 'height':'100%', 'overflow':'auto', 'background-color':'rgb(0,0,0)', 'background-color':'rgba(0,0,0,0.4)'});
    $('.modal-content').css({'position':'relative', 'background-color':'#fefefe', 'margin':'auto', 'padding':'0', 'border':'1px solid #888', 'width':'fit-content', 'box-shadow':'0 4px 8px 0 rgba(0,0,0,0.2),0 6px 20px 0 rgba(0,0,0,0.19)', '-webkit-animation-name':'animatetop','-webkit-animation-duration':'0.4s','animation-name':'animatetop', 'animation-duration':'0.4s'});
    $('.modal-header').css({'padding':'2px 16px', 'background-color':'#5cb85c', 'color':'white'});
    $('.modal-body').css({'padding': '2px 16px', 'color':'black'});
    $('.modal-footer').css({'padding':'2px 16px', 'background-color':'#5cb85c', 'corol':'white'});

    var link_string = '<a href="#" onclick="return false;" class="short-enter-leave-link"><i class="fa"></i> <span></span></a>';
    var vote_all_string = '<a id="vote_all" href="#" onclick="return false;"><i class="fa fa-plus"></i> Vote all </a>';
    var vote_all_button = $(vote_all_string);
    var waste_points_string = '<a id="waste_points" href="#" onclick="return false;"><i class="fa fa-bomb" aria-hidden="true"></i></a>';
    var waste_points_button = $(waste_points_string);
    var edit_wishlist_sting = '<a id="edit_wishlist" href="#" onclick="return false;"><i class="fa fa-heart" aria-hidden="true"></i></a>';
    var edit_wishlist_button = $(edit_wishlist_sting);
    $('.page__heading__breadcrumbs').after(vote_all_button);
    $('.page__heading__breadcrumbs').after(waste_points_button);
    $('.page__heading__breadcrumbs').after(edit_wishlist_button);
    $('#waste_points').click(wastePoints);
    $('#edit_wishlist').click(editSavedWishlist);
    $('#vote_all').click(function () {
        var giveaways = $('.giveaway__row-inner-wrap').not('.pinned-giveaways__outer-wrap .giveaway__row-inner-wrap').not('.is-faded');
        giveaways = giveaways.not('.esgst-hidden .giveaway__row-inner-wrap');
        GM_log(giveaways);
        var confirmation = 'enter ' + giveaways.length + ' giveaways?';
        if (giveaways.length > 10 && !confirm(confirmation)) return;
        giveaways.each(function (idx, elem) {
            var j = $(elem);
            if (j.find('.giveaway__column--contributor-level').hasClass('giveaway__column--contributor-level--negative')) {
                return;
            }
            var href = $(j.find('.giveaway__heading__name')).attr('href');
            //var details = j.find('.giveaway__heading__thin').text();
            //var detailsMatch = details.match(/(\(([0-9]*)\sCopies\))?\s?\(([0-9]*)P\)/);
            //var copies = detailsMatch[2] === undefined ? 1 : detailsMatch[2];
            //var cost = detailsMatch[3];
            $.ajax(href, {
                complete: function (data, code) {
                    var f = $(data.responseText).find('div[data-do="entry_insert"]').closest('form').serializeArray();
                    if (f.length === 0) {
                        GM_log('error (cannot enter givaway)');
                        return;
                    }
                    f[1].value = "entry_insert";
                    $.ajax('/ajax.php', {
                        data: f,
                        method: 'POST',
                        complete: function (data1, code1) {
                            if (data1.responseText === "") return;
                            var d = JSON.parse(data1.responseText);
                            GM_log(d.type);
                            if (d.type === "success") {
                                j.addClass("is-faded");
                                $('.nav__points').text(d.points);
                            }
                        }
                    });
                }
            }); //ajax
        }); //ga.each
    });//vote all click func
})();