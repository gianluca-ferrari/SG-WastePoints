// ==UserScript==
// @name         SG-WastePoints
// @namespace    gian.scripts
// @version      1.2.2
// @updateURL    https://github.com/gianluca-ferrari/SG-WastePoints/raw/master/SteamGift%20Vote-All.user.js
// @description  Vote-all button to enter all giveaways on the page (skips faded ga and esgt-hidden giveaways)
// @author       gian raiden
// @include      https://www.steamgifts.com/
// @include      https://www.steamgifts.com/giveaways*
// @include      https://store.steampowered.com/app/*
// @grant        GM_log
// @grant        GM_listValues
// @grant        GM_setValue
// @grant        GM_deleteVlue
// @grant        GM_getValue
// @grant        GM_setClipboard
// ==/UserScript==
/**
 * Add a game to tampermonkey stored wishlist. Returns -1 if fails, 1 if success, 0 if game alredy was wishlisted.
 * @param {string} title 
 * @param {number} appid
 */
function addToWishlist(title, appid) {
    try{
        var wishlist = loadWishlist();
        var vett = [];
        if(wishlist.find(function(o){return (o.appid == appid);})){
            console.log(appid + ' already in wishlist');
            return 0;
        }
        wishlist.push({'title':title, 'appid':appid});
        console.log(appid + ' added to wishlist');
        saveWishlist(wishlist);
        return 1;
    }
    catch(err){
        alert('failed adding game to wishlist: ' + err.message);
        return -1;
    }
}
/**
 * remove appid from passed wishlist. changes needs to be saved afterwards.
 * @param {number} appid 
 * @param {Array<>} wishlist 
 */
function removeFromWishlist(appid, wishlist){
    var i = wishlist.findIndex(function(v){return v.appid==appid;});
    if(i==-1){
        alert('item not found | wishlist empty');
        return;
    }
    wishlist.splice(i,1);
    console.log(appid + ' removed from wishlist');
}

function isInWishlist(appid){
    var wishlist = loadWishlist();
    var i = wishlist.findIndex(function(v){return v.appid==appid;});
    if(i==-1){
        console.log('item not found | wishlist empty');
        return false;
    }
    return true;
}

function displayWishlist(wishlist){
    $('.modal-body').html('');
    wishlist.forEach(function(game, i){
        var p = $('<p></p>');
        var link = $('<a href="http://store.steampowered.com/app/' + game.appid + '" target="_blank" style="text-decoration:underline">[' + i + '] ' + game.title + ' : ' + game.appid + '</a>');
        var removebtn = $('<i class="fa fa-times" aria-hidden="true"></i>');
        removebtn.click(function(){
            removeFromWishlist(game.appid, wishlist);
            p.hide();
        });
        p.append(removebtn);
        p.append(link);
        $('.modal-body').append(p);
    });
}


function saveWishlist(wishlist) {
    GM_setValue('wishlist', JSON.stringify(wishlist));
    console.log(wishlist);
}
/**
 * @return {Array<>}
 */
function loadWishlist() {
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
    $('.modal-body').html('');
    $('.sgwaste_modal_button').css('display', 'none');
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

    //STEAM APP PAGE ONLY
    if (location.href.startsWith('https://store.steampowered.com/app/')){
        var div = document.createElement('div');
        var appid = document.getElementsByClassName('glance_tags popular_tags')[0].getAttribute('data-appid');
        var title = document.getElementsByClassName('apphub_AppName')[0].innerHTML;
        // div.innerHTML= `<a id="waste-points-btn" class="btnv6_blue_hoverfade btn_medium" href="#" data-store-tooltip="Add to tampermonkey.steamgiftWishlist"><span>SG-Wishlist</span></a>`;
        div.innerHTML= `<span style="line-height: 30px;">SG-Wishlist</span>`;
        div.style = "border-style: solid; border-width: 1px;";
        if(isInWishlist(appid)){
            div.style.backgroundColor = 'mediumseagreen';
        }
        document.getElementsByClassName('apphub_HeaderStandardTop')[0].appendChild(div);
        div.onclick = function(){
            console.log(title + ': ' + appid);
            var re;
            if(isInWishlist(appid)){
                var wishlist = loadWishlist();
                re = removeFromWishlist(appid, wishlist);
                saveWishlist(wishlist);
                div.style.backgroundColor = '';
            } else {
                re = addToWishlist(title, appid);
                if(re == 1){
                    div.style.backgroundColor = 'mediumseagreen';
                } else if (re == 0){
                    div.style.backgroundColor = 'cornflowerblue';
                } else {
                    div.style.backgroundColor = 'red';
                }
            }
        };
        return;
    }

    //STEAMGIFT MODAL HTML
    $('body').append('<div id="myModal" class="modal"> <!-- Modal content --> <div class="modal-content"> <div class="modal-header"> <h2>Riepilogo</h2> </div> <div class="modal-body"> </div> <div class="modal-footer"> </div> </div></div>');
    $('.modal-footer').append('<a class="nav__button sgwaste_modal_button" id="sgwaste_export" href="#">Export to Clipboard</a>');
    $('.modal-footer').append('<a class="nav__button sgwaste_modal_button" id="sgwaste_import" href="#">Import</a>');
    $('.modal-footer').append('<a class="nav__button sgwaste_modal_button" id="sgwaste_save" href="#">Save</a>');

    //STEAMGIFT MODAL CSS
    $('.modal').css({'display':'none', 'position':'fixed', 'z-index':'999', 'padding-top':'100px', 'left':'0', 'top':'0', 'width':'100%', 'height':'100%', 'overflow':'auto', 'background-color':'rgb(0,0,0)', 'background-color':'rgba(0,0,0,0.4)'});
    $('.modal-content').css({'position':'relative', 'background-color':'#fefefe', 'margin':'auto', 'padding':'0', 'border':'1px solid #888', 'width':'fit-content', 'box-shadow':'0 4px 8px 0 rgba(0,0,0,0.2),0 6px 20px 0 rgba(0,0,0,0.19)', '-webkit-animation-name':'animatetop','-webkit-animation-duration':'0.4s','animation-name':'animatetop', 'animation-duration':'0.4s'});
    $('.modal-header').css({'padding':'2px 16px', 'background-color':'#5cb85c', 'color':'white'});
    $('.modal-body').css({'padding': '2px 16px', 'color':'black', 'max-height':'600px', 'overflow-y':'scroll'});
    $('.modal-footer').css({'padding':'2px 16px', 'background-color':'#5cb85c', 'corol':'white'});
    $('.sgwaste_modal_button').css('display', 'none');


    //STEAMGIFT MODAL SCRIPT
    var modal = document.getElementById('myModal');
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
    var wishlist = [];
    $('#sgwaste_export').click(function(){
        GM_setClipboard(JSON.stringify(wishlist), 'wishlist json');
    });
    $('#sgwaste_import').click(function(){
        var temp = prompt('Enter new wishlist json:', '[{"title":"game1","appid":"123"},{"title":"game2","appid":"456"}]');
        if(temp){
            try{
                wishlist = JSON.parse(temp);
                displayWishlist(wishlist);
            }
            catch(error){
                alert(error.message);
            }
        }
    });
    $('#sgwaste_save').click(function(){
        saveWishlist(wishlist);
        modal.style.display= 'none';
    });

    //STEAMGIFT SCRIPT MAIN BUTTONS
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
    $('#edit_wishlist').click(function () {
        try{
            wishlist = loadWishlist();
            $('.modal-header').text('Wishlist');
            $('.sgwaste_modal_button').css('display', 'inline');
            displayWishlist(wishlist);

            $('#myModal').css('display', 'block');

            return;

        }
        catch(err){
            alert(err.message);
            return;
        }
    });
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