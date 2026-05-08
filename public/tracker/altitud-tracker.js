/**
 * Altitud Hub — Lightweight Property Analytics Tracker
 * 
 * Include on any page to track listing views:
 * 
 * <script src="https://hub.remax-altitud.cr/tracker/altitud-tracker.js"
 *         data-hub-url="https://hub.remax-altitud.cr"
 *         data-property-id="PROPERTY_UUID"
 *         data-development-id="DEVELOPMENT_UUID"
 *         async></script>
 * 
 * Features:
 * - Page view tracking on load
 * - Time-on-page via navigator.sendBeacon on unload
 * - Device type detection (desktop/mobile/tablet)
 * - Anonymous session ID (localStorage, no cookies)
 * - Minimal footprint (~2KB), async loading
 * - No performance impact on host page
 */
(function() {
  'use strict';

  // Get configuration from script tag attributes
  var script = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var hubUrl = script.getAttribute('data-hub-url') || '';
  var propertyId = script.getAttribute('data-property-id') || '';
  var developmentId = script.getAttribute('data-development-id') || '';

  if (!hubUrl) return;

  // Device detection
  function getDeviceType() {
    var ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  // Anonymous session ID
  function getSessionId() {
    var key = '_altitud_sid';
    var sid = '';
    try {
      sid = localStorage.getItem(key);
      if (!sid) {
        sid = 'a' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem(key, sid);
      }
    } catch(e) {
      sid = 'a' + Math.random().toString(36).substr(2, 9);
    }
    return sid;
  }

  var sessionId = getSessionId();
  var startTime = Date.now();
  var viewId = null;

  // Send page view
  function trackPageView() {
    var payload = {
      property_id: propertyId || null,
      development_id: developmentId || null,
      page_url: window.location.href,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      device_type: getDeviceType(),
      session_id: sessionId,
    };

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', hubUrl + '/api/public/analytics/track', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 204) {
          try {
            var resp = JSON.parse(xhr.responseText);
            viewId = resp.view_id;
          } catch(e) {}
        }
      };
      xhr.send(JSON.stringify(payload));
    } catch(e) {}
  }

  // Send time-on-page via beacon on unload
  function trackDuration() {
    var duration = Math.round((Date.now() - startTime) / 1000);
    if (duration < 2) return; // Skip very short visits

    var payload = JSON.stringify({
      session_id: sessionId,
      property_id: propertyId || null,
      development_id: developmentId || null,
      duration_seconds: duration,
      view_id: viewId,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        hubUrl + '/api/public/analytics/beacon',
        new Blob([payload], { type: 'application/json' })
      );
    }
  }

  // Track on load
  if (document.readyState === 'complete') {
    trackPageView();
  } else {
    window.addEventListener('load', trackPageView);
  }

  // Track duration on unload
  window.addEventListener('beforeunload', trackDuration);
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') trackDuration();
  });
})();
