'use strict';

var url = require('url');

exports = module.exports = function historyApiFallback(options) {
  options = options || {};
  var logger = getLogger(options);

  return function(req, res, next) {
    var headers = req.headers;
    if (req.method !== 'GET') {
      logger(
        'Not rewriting',
        req.method,
        req.url,
        'because the method is not GET.'
      );
      return next();
    } else if (!headers || typeof headers.accept !== 'string') {
      logger(
        'Not rewriting',
        req.method,
        req.url,
        'because the client did not send an HTTP accept header.'
      );
      return next();
    } else if (headers.accept.indexOf('application/json') === 0) {
      logger(
        'Not rewriting',
        req.method,
        req.url,
        'because the client prefers JSON.'
      );
      return next();
    } else if (!acceptsHtml(headers.accept)) {
      logger(
        'Not rewriting',
        req.method,
        req.url,
        'because the client does not accept HTML.'
      );
      return next();
    }

    var parsedUrl = url.parse(req.url);
    var actualPathname = parsedUrl.pathname && parsedUrl.pathname.split('?')[0];
    var rewriteTarget;
    options.rewrites = options.rewrites || [];
    for (var i = 0; i < options.rewrites.length; i++) {
      var rewrite = options.rewrites[i];
      var match = parsedUrl.pathname.match(rewrite.from);
      if (match !== null) {
        rewriteTarget = evaluateRewriteRule(parsedUrl, match, rewrite.to);
        logger('Rewriting', req.method, req.url, 'to', rewriteTarget);
        req.url = rewriteTarget;
        return next();
      }
    }

    options.exceptions = options.exceptions || [];
    for (var i2 = 0; i2 < options.exceptions.length; i2++) {
      if (actualPathname.match(options.exceptions[i2]) !== null) {
        logger(
          'Not rewriting',
          req.method,
          req.url,
          'because the pathname matches one of the exceptions exceptions'
        );
        return next();
      }
    }


    if (!(actualPathname.indexOf('.html') > -1 ||
            actualPathname.indexOf('.') === -1)) {
      logger(
        'Not rewriting',
        req.method,
        req.url,
        'because the path does not have .html in it or includes a dot (.) character. See the connect-history-api-fallback module required by koa-connect-history-api-fallback module'
      );
      return next();
    }

    rewriteTarget = options.index || '/index.html';
    logger('Rewriting', req.method, req.url, 'to', rewriteTarget);
    req.url = rewriteTarget;
    next();
  };
};

function evaluateRewriteRule(parsedUrl, match, rule) {
  if (typeof rule === 'string') {
    return rule;
  } else if (typeof rule !== 'function') {
    throw new Error('Rewrite rule can only be of type string of function.');
  }

  return rule({
    parsedUrl: parsedUrl,
    match: match
  });
}

function acceptsHtml(header) {
  return header.indexOf('text/html') !== -1 || header.indexOf('*/*') !== -1;
}

function getLogger(options) {
  if (options && options.logger) {
    return options.logger;
  } else if (options && options.verbose) {
    return console.log.bind(console);
  }
  return function(){};
}
