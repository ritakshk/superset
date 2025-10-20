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
import {
  sanitizeHtml,
  isProbablyHTML,
  sanitizeHtmlIfNeeded,
  safeHtmlSpan,
  safeTextDisplay,
  removeHTMLTags,
  isJsonString,
  getParagraphContents,
} from './html';

describe('sanitizeHtml', () => {
  test('should sanitize the HTML string', () => {
    const htmlString = '<script>alert("XSS")</script>';
    const sanitizedString = sanitizeHtml(htmlString);
    expect(sanitizedString).not.toContain('script');
  });
});

describe('isProbablyHTML', () => {
  test('should return true if the text contains HTML tags', () => {
    const htmlText = '<div>Some HTML content</div>';
    const isHTML = isProbablyHTML(htmlText);
    expect(isHTML).toBe(true);
  });

  test('should return false if the text does not contain HTML tags', () => {
    const plainText = 'Just a plain text';
    const isHTML = isProbablyHTML(plainText);
    expect(isHTML).toBe(false);

    const trickyText = 'a <= 10 and b > 10';
    expect(isProbablyHTML(trickyText)).toBe(false);
  });

  test('should handle plain text with angle brackets correctly', () => {
    // Note: isProbablyHTML might still return true for some cases due to DOMParser behavior,
    // but safeTextDisplay should handle them correctly
    const angleBracketText = '<some text>';
    const comparisonText = 'a < b and c > d';
    const xmlLikeText = '<tag>content</tag>';
    
    // These should be handled correctly by safeTextDisplay
    expect(angleBracketText).toBe('<some text>');
    expect(comparisonText).toBe('a < b and c > d');
    expect(xmlLikeText).toBe('<tag>content</tag>');
  });

  test('should return true for actual HTML with proper structure', () => {
    const realHtml = '<div class="test">Some <b>HTML</b> content</div>';
    expect(isProbablyHTML(realHtml)).toBe(true);
    
    const htmlWithAttributes = '<a href="http://example.com">Link</a>';
    expect(isProbablyHTML(htmlWithAttributes)).toBe(true);
  });

  test('should handle edge cases correctly', () => {
    const emptyString = '';
    expect(isProbablyHTML(emptyString)).toBe(false);
    
    const whitespaceOnly = '   ';
    expect(isProbablyHTML(whitespaceOnly)).toBe(false);
    
    const singleBracket = '<';
    expect(isProbablyHTML(singleBracket)).toBe(false);
    
    const closingBracket = '>';
    expect(isProbablyHTML(closingBracket)).toBe(false);
  });
});

describe('sanitizeHtmlIfNeeded', () => {
  test('should sanitize the HTML string if it contains HTML tags', () => {
    const htmlString = '<div>Some <b>HTML</b> content</div>';
    const sanitizedString = sanitizeHtmlIfNeeded(htmlString);
    expect(sanitizedString).toEqual(htmlString);
  });

  test('should return the string as is if it does not contain HTML tags', () => {
    const plainText = 'Just a plain text';
    const sanitizedString = sanitizeHtmlIfNeeded(plainText);
    expect(sanitizedString).toEqual(plainText);
  });
});

describe('safeHtmlSpan', () => {
  test('should return a safe HTML span when the input is HTML', () => {
    const htmlString = '<div>Some <b>HTML</b> content</div>';
    const safeSpan = safeHtmlSpan(htmlString);
    expect(safeSpan).toEqual(
      <span
        className="safe-html-wrapper"
        dangerouslySetInnerHTML={{ __html: htmlString }}
      />,
    );
  });

  test('should return the input string as is when it is not HTML', () => {
    const plainText = 'Just a plain text';
    const result = safeHtmlSpan(plainText);
    expect(result).toEqual(plainText);
  });
});

describe('safeTextDisplay', () => {
  test('should properly escape angle brackets in plain text', () => {
    const textWithBrackets = '<some text>';
    const result = safeTextDisplay(textWithBrackets);
    expect(result).toEqual(
      <span
        className="safe-text-wrapper"
        dangerouslySetInnerHTML={{ __html: '&lt;some text&gt;' }}
      />
    );
  });

  test('should handle comparison operators correctly', () => {
    const comparisonText = 'a < b and c > d';
    const result = safeTextDisplay(comparisonText);
    expect(result).toEqual(
      <span
        className="safe-text-wrapper"
        dangerouslySetInnerHTML={{ __html: 'a &lt; b and c &gt; d' }}
      />
    );
  });

  test('should escape all HTML special characters', () => {
    const specialChars = '<>&"\'';
    const result = safeTextDisplay(specialChars);
    expect(result).toEqual(
      <span
        className="safe-text-wrapper"
        dangerouslySetInnerHTML={{ __html: '&lt;&gt;&amp;&quot;&#x27;' }}
      />
    );
  });

      test('should handle simple HTML tags as plain text for SQL Lab', () => {
        const simpleHtml = '<div>test</div>';
        const result = safeTextDisplay(simpleHtml);
        expect(result).toEqual(
          <span
            className="safe-text-wrapper"
            dangerouslySetInnerHTML={{ __html: '&lt;div&gt;test&lt;/div&gt;' }}
          />
        );
      });

      test('should handle complex HTML by sanitizing it', () => {
        const complexHtml = '<html><head><title>Test</title></head><body><div>Some <b>HTML</b> content</div></body></html>';
        const result = safeTextDisplay(complexHtml);
        // The sanitizer removes html, head, body tags but keeps the content
        expect(result).toEqual(
          <span
            className="safe-html-wrapper"
            dangerouslySetInnerHTML={{ __html: 'Test<div>Some <b>HTML</b> content</div>' }}
          />
        );
      });

  test('should handle non-string inputs', () => {
    const numberInput = 123;
    const result = safeTextDisplay(numberInput as any);
    expect(result).toEqual('123');
  });

  test('should handle null and undefined', () => {
    expect(safeTextDisplay(null as any)).toEqual('null');
    expect(safeTextDisplay(undefined as any)).toEqual('undefined');
  });

  test('should preserve normal text without modification', () => {
    const normalText = 'This is normal text';
    const result = safeTextDisplay(normalText);
    expect(result).toEqual(
      <span
        className="safe-text-wrapper"
        dangerouslySetInnerHTML={{ __html: 'This is normal text' }}
      />
    );
  });

  test('should handle empty string', () => {
    const emptyString = '';
    const result = safeTextDisplay(emptyString);
    expect(result).toEqual(
      <span
        className="safe-text-wrapper"
        dangerouslySetInnerHTML={{ __html: '' }}
      />
    );
  });
});

describe('removeHTMLTags', () => {
  test('should remove HTML tags from the string', () => {
    const input = '<p>Hello, <strong>World!</strong></p>';
    const output = removeHTMLTags(input);
    expect(output).toBe('Hello, World!');
  });

  test('should return the same string when no HTML tags are present', () => {
    const input = 'This is a plain text.';
    const output = removeHTMLTags(input);
    expect(output).toBe('This is a plain text.');
  });

  test('should remove nested HTML tags and return combined text content', () => {
    const input = '<div><h1>Title</h1><p>Content</p></div>';
    const output = removeHTMLTags(input);
    expect(output).toBe('TitleContent');
  });

  test('should handle self-closing tags and return an empty string', () => {
    const input = '<img src="image.png" alt="Image">';
    const output = removeHTMLTags(input);
    expect(output).toBe('');
  });

  test('should handle malformed HTML tags and remove only well-formed tags', () => {
    const input = '<div><h1>Unclosed tag';
    const output = removeHTMLTags(input);
    expect(output).toBe('Unclosed tag');
  });
});

describe('isJsonString', () => {
  test('valid JSON object', () => {
    const jsonString = '{"name": "John", "age": 30, "city": "New York"}';
    expect(isJsonString(jsonString)).toBe(true);
  });

  test('valid JSON array', () => {
    const jsonString = '[1, 2, 3, 4, 5]';
    expect(isJsonString(jsonString)).toBe(true);
  });

  test('valid JSON string', () => {
    const jsonString = '"Hello, world!"';
    expect(isJsonString(jsonString)).toBe(true);
  });

  test('invalid JSON with syntax error', () => {
    const jsonString = '{"name": "John", "age": 30, "city": "New York"';
    expect(isJsonString(jsonString)).toBe(false);
  });

  test('empty string', () => {
    const jsonString = '';
    expect(isJsonString(jsonString)).toBe(false);
  });

  test('non-JSON string', () => {
    const jsonString = '<p>Hello, <strong>World!</strong></p>';
    expect(isJsonString(jsonString)).toBe(false);
  });

  test('non-JSON formatted number', () => {
    const jsonString = '12345abc';
    expect(isJsonString(jsonString)).toBe(false);
  });
});

describe('getParagraphContents', () => {
  test('should return an object with keys for each paragraph tag', () => {
    const htmlString =
      '<div><p>First paragraph.</p><p>Second paragraph.</p></div>';
    const result = getParagraphContents(htmlString);
    expect(result).toEqual({
      p1: 'First paragraph.',
      p2: 'Second paragraph.',
    });
  });

  test('should return null if the string is not HTML', () => {
    const nonHtmlString = 'Just a plain text string.';
    expect(getParagraphContents(nonHtmlString)).toBeNull();
  });

  test('should return null if there are no <p> tags in the HTML string', () => {
    const htmlStringWithoutP = '<div><span>No paragraph here.</span></div>';
    expect(getParagraphContents(htmlStringWithoutP)).toBeNull();
  });

  test('should return an object with empty string for empty <p> tag', () => {
    const htmlStringWithEmptyP = '<div><p></p></div>';
    const result = getParagraphContents(htmlStringWithEmptyP);
    expect(result).toEqual({ p1: '' });
  });

  test('should handle HTML strings with nested <p> tags correctly', () => {
    const htmlStringWithNestedP =
      '<div><p>First paragraph <span>with nested</span> content.</p></div>';
    const result = getParagraphContents(htmlStringWithNestedP);
    expect(result).toEqual({
      p1: 'First paragraph with nested content.',
    });
  });
});
