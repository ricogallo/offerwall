/*
  Vanilla JS implementation: way faster than React.js
*/

(function () {
  'use strict';
  
  var offersURL    = 'http://www.360dialog.com/fe-challenge/offers.json';
  var trackingURL  = 'http://rt.360dialog.io/test/track';
  var offersListEl = document.querySelector('.offers');
  var statusEl    = document.querySelector('.status');
  
  var loadFromStorage = function (store) {
    return JSON.parse(localStorage.getItem(store) || '{}');
  };
  
  var saveIntoStorage = function (store, val) {
    localStorage.setItem(store, JSON.stringify(val));
  };
  
  var fetchOffers = function () {
    return new Promise(function (resolve, reject) {
      var request = new XMLHttpRequest();
      request.open('GET', offersURL, true);

      request.onload = function() {
        if (this.status >= 200 && this.status < 300) {
          var offers = JSON.parse(this.response).offers;
          resolve(offers);
        } else {
          reject('There is an error from server! %s', this.status);
        }
      };

      request.send();  
    })
  };
  
  var sendToTracker = function (data) {
    return new Promise(function (resolve, reject) {
      resolve(data);
    })
  };
  
  var createElement = function (opts) {
    var el = opts.name === 'img' ?
             new Image() :
             document.createElement(opts.name);

    if (opts.className) el.className = opts.className;
    if (opts.src) el.src = opts.src;
    if (opts.text) el.innerText = opts.text;
    if (opts.parent) opts.parent.appendChild(el);  
    
    return el;
  };
  
  var getElementCurrentPos = function (parent, element) {
    return Array.prototype.indexOf.call(parent, element);
  };
  
  // builds the offer's DOM, faster than using innerHTML
  var buildOfferItem = function (offer) {
    var offerEl = createElement({
      name: 'li',
      className: 'offers__item'
    });
    
    // banner
    var bannerEl = createElement({
      name: 'img',
      className: 'offers__banner',
      src: offer.bannerUrl,
      parent: offerEl
    });
    
    // offer item body
    var offerBodyEl = createElement({
      name: 'div',
      className: 'offers__body',
      parent: offerEl
    });
    
    // title
    var titleEl = createElement({
      name: 'span',
      className: 'offers__title',
      text: offer.content_parameters.title,
      parent: offerBodyEl
    });
    
    // tags
    var tagsListEl = createElement({
      name: 'ul',
      className: 'offers__taglist',
      parent: offerBodyEl
    });
    
    offer.content_parameters.tags.forEach(function (tag) {
      createElement({
        name: 'li',
        className: 'offers__tag',
        text: tag,
        parent: tagsListEl
      });
    });
    
    // credits
    var creditsEl = createElement({
      name: 'div',
      className: 'offers__credits-container',
      parent: offerEl
    });
    
    var creditsCounterEl = createElement({
      name: 'span',
      className: 'offers__credits-counter',
      text: offer.credits,
      parent: creditsEl
    });
    
    // hint
    var hintEl = createElement({
      name: 'span',
      className: 'offers__hint',
      text: offer.content_parameters.hint,
      parent: creditsEl
    });
    
    return offerEl;
  };
  
  // increments the tag and click counters, saved on localStorage
  var incrementCounters = function (offer) {
    // increments offer counter and save it
    var offers = loadFromStorage('offers');
    offers[offer.campaign] = offers[offer.campaign] ?
                             +offers[offer.campaign] + 1 : 1;
    saveIntoStorage('offers', offers);
    
    // increment tag counter and save it
    var tags = loadFromStorage('tags');
    offer.content_parameters.tags.forEach(function (tag) {
      tags[tag] = tags[tag] ? +tags[tag] + 1 : 1;
    });
    saveIntoStorage('tags', tags);
  };
  
  // returns true if the offer has been clicked 3 times
  var checkClickCounter = function (offer) {
    var offers = loadFromStorage('offers');
    var counter = offers[offer.campaign] ? offers[offer.campaign] : 0;
    return counter >= 3;
  };
  
  // retrives the single tag score from localStorage
  var getTagScore = function (tag) {
    var tags = loadFromStorage('tags');
    return +tags[tag] || 0;
  };
  
  var getOfferScoreByTags = function (offer) {
    return offer.content_parameters.tags.reduce(function (prev, next) {
      return getTagScore(prev) + getTagScore(next);
    }, 0);
  };
  
  var bindOfferItem = function (offer, offerEl) {
    // redirect the user to the app location, but send the tracking data first
    offerEl.addEventListener('click', function () {
      incrementCounters(offer);

      if (checkClickCounter(offer)) {
        offersListEl.removeChild(offerEl);
      }
      
      sendToTracker({
        'offer': {
          'campaign': offer.campaign,
          'position': getElementCurrentPos(offersListEl.childNodes, offerEl)
        }
      }).then(function (data) {
        console.log(data);
        window.location = offer.clickUrl;
      });

    }, false);
  };
  
  var addOfferToList = function (offerEl) {    
    offersListEl.appendChild(offerEl);
  };
  
  // starting point, we collect the offers and send the campaign ids to analytics
  fetchOffers()
    .then(function (offers) {
      document.body.removeChild(statusEl);
      
      // send the offers to the tracker using the original order
      var trackerPromise = sendToTracker({
        'offers': offers.map(function (offer) {
          return offer.campaign;
        })
      });
      
      // sort them by tags' score
      offers.sort(function (a, b) {
        // console.log(getOfferScoreByTags(a), getOfferScoreByTags(b));
        if (getOfferScoreByTags(a) > getOfferScoreByTags(b)) {
          return -1;
        }
        
        if (getOfferScoreByTags(a) < getOfferScoreByTags(b)) {
          return 1;
        }
        
        return 0;
      });
    
      
      // add the offers to the view
      offers.forEach(function (offer) {
        // if the offer is ok add it to the list  
        if (offer.isIncentive && !offer.isFallback && !checkClickCounter(offer)) {
          var offerEl = buildOfferItem(offer);
          bindOfferItem(offer, offerEl);
          addOfferToList(offerEl);  
        }
      });
      
      return trackerPromise;
    })
    .then(function (data) {
      console.log(data);
    })
    .catch(function (error) {
      // report any errors
      statusEl.innerText = error;
    });
})();