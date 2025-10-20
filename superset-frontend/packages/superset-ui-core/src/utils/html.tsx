/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { FilterXSS, getDefaultWhiteList } from 'xss';

const xssFilter = new FilterXSS({
  whiteList: {
    ...getDefaultWhiteList(),
    span: ['style', 'class', 'title'],
    div: ['style', 'class'],
    a: ['style', 'class', 'href', 'title', 'target'],
    img: ['style', 'class', 'src', 'alt', 'title', 'width', 'height'],
    video: [
      'autoplay',
      'controls',
      'loop',
      'preload',
      'src',
      'height',
      'width',
      'muted',
    ],
  },
  stripIgnoreTag: true,
  css: false,
});

export function sanitizeHtml(htmlString: string) {
  return xssFilter.process(htmlString);
}

export function hasHtmlTagPattern(str: string): boolean {
  const htmlTagPattern =
    /<(html|head|body|div|span|a|p|h[1-6]|title|meta|link|script|style)/i;

  return htmlTagPattern.test(str);
}

export function isProbablyHTML(text: string) {
  const cleanedStr = text.trim().toLowerCase();

  // Check for explicit HTML document declaration
  if (
    cleanedStr.startsWith('<!doctype html>') &&
    hasHtmlTagPattern(cleanedStr)
  ) {
    return true;
  }

  // Use DOMParser to detect HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanedStr, 'text/html');
  return Array.from(doc.body.childNodes).some(({ nodeType }) => nodeType === 1);
}

export function sanitizeHtmlIfNeeded(htmlString: string) {
  return isProbablyHTML(htmlString) ? sanitizeHtml(htmlString) : htmlString;
}

export function safeHtmlSpan(possiblyHtmlString: string) {
  const isHtml = isProbablyHTML(possiblyHtmlString);
  if (isHtml) {
    return (
      <span
        className="safe-html-wrapper"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(possiblyHtmlString) }}
      />
    );
  }
  return possiblyHtmlString;
}

/**
 * Safely displays text content for SQL Lab results.
 * This function is specifically designed to handle data from SQL queries
 * that may contain angle brackets or other special characters.
 * It provides a balance between security and data preservation.
 */
export function safeTextDisplay(text: string) {
  if (typeof text !== 'string') {
    return String(text);
  }

  // For SQL Lab results, we'll use a simple heuristic to detect likely HTML
  // This is more conservative and avoids false positives with plain text
  const isLikelyHtml = isLikelyRealHTML(text);
  
  if (isLikelyHtml) {
    // If it's genuine HTML, sanitize and render it
    return (
      <span
        className="safe-html-wrapper"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
      />
    );
  }
  
  // For plain text, escape HTML characters to prevent interpretation
  // but preserve the original content for display
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
    
  return (
    <span
      className="safe-text-wrapper"
      dangerouslySetInnerHTML={{ __html: escapedText }}
    />
  );
}

/**
 * Conservative HTML detection specifically for SQL Lab results.
 * Only treats content as HTML if it has clear HTML document structure.
 * For SQL Lab, we want to err on the side of treating content as plain text.
 */
function isLikelyRealHTML(text: string): boolean {
  const trimmed = text.trim();
  
  // Empty or very short strings are not HTML
  if (trimmed.length < 3) {
    return false;
  }
  
  // Check for explicit HTML document declaration
  if (trimmed.toLowerCase().startsWith('<!doctype html>')) {
    return true;
  }
  
  // Check for clear HTML document structure
  const hasDocumentStructure = /<(html|head|body)/i.test(trimmed);
  const hasMetaTags = /<(meta|link|script|style)/i.test(trimmed);
  
  if (hasDocumentStructure || hasMetaTags) {
    return true; // Clear HTML document structure
  }
  
  // For SQL Lab, treat everything else as plain text
  // This includes simple tags like <div>content</div>
  return false;
}

export function removeHTMLTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

export function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

export function getParagraphContents(
  str: string,
): { [key: string]: string } | null {
  if (!isProbablyHTML(str)) {
    return null;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(str, 'text/html');
  const pTags = doc.querySelectorAll('p');

  if (pTags.length === 0) {
    return null;
  }

  const paragraphContents: { [key: string]: string } = {};

  pTags.forEach((pTag, index) => {
    paragraphContents[`p${index + 1}`] = pTag.textContent || '';
  });

  return paragraphContents;
}
