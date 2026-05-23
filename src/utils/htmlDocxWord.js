import JSZip from 'jszip';

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/afchunk.mht" ContentType="message/rfc822"/>
</Types>
`;

const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="/word/document.xml" Id="officeDocument" />
</Relationships>
`;

const documentXmlRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="/word/afchunk.mht" Id="htmlChunk" />
</Relationships>
`;

const defaultMargins = {
  top: 1440,
  right: 1440,
  bottom: 1440,
  left: 1440,
  header: 720,
  footer: 720,
  gutter: 0,
};

const documentTemplate = (width, height, orient, margins) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:altChunk r:id="htmlChunk" />
    <w:sectPr>
      <w:pgSz w:w="${width}" w:h="${height}" w:orient="${orient}" />
      <w:pgMar w:top="${margins.top}"
               w:right="${margins.right}"
               w:bottom="${margins.bottom}"
               w:left="${margins.left}"
               w:header="${margins.header}"
               w:footer="${margins.footer}"
               w:gutter="${margins.gutter}"/>
    </w:sectPr>
  </w:body>
</w:document>
`;

const mhtDocumentTemplate = (htmlSource, contentParts) => `MIME-Version: 1.0
Content-Type: multipart/related;
    type="text/html";
    boundary="----=mhtDocumentPart"


------=mhtDocumentPart
Content-Type: text/html;
    charset="utf-8"
Content-Transfer-Encoding: quoted-printable
Content-Location: document.html

${htmlSource}

${contentParts}

------=mhtDocumentPart--
`;

const mhtPartTemplate = (contentType, contentEncoding, contentLocation, encodedContent) => `------=mhtDocumentPart
Content-Type: ${contentType}
Content-Transfer-Encoding: ${contentEncoding}
Content-Location: ${contentLocation}

${encodedContent}
`;

const getMHTdocument = (htmlSource) => {
  const imageContentParts = [];
  const inlinedSrcPattern = /"data:([^;"]+);([^,"]+),([^"]+)"/g;

  const htmlWithImageRefs = htmlSource.replace(
    inlinedSrcPattern,
    (match, contentType, contentEncoding, encodedContent) => {
      const index = imageContentParts.length;
      const extension = contentType.split('/')[1]?.replace('+xml', '') || 'png';
      const contentLocation = `image${index}.${extension}`;

      imageContentParts.push(
        mhtPartTemplate(contentType, contentEncoding, contentLocation, encodedContent)
      );

      return `"${contentLocation}"`;
    }
  );

  return mhtDocumentTemplate(
    htmlWithImageRefs.replace(/=/g, '=3D'),
    imageContentParts.join('\n')
  );
};

const renderDocumentFile = (options = {}) => {
  const orientation = options.orientation || 'portrait';
  const margins = { ...defaultMargins, ...(options.margins || {}) };
  const isLandscape = orientation === 'landscape';
  return documentTemplate(
    isLandscape ? 15840 : 12240,
    isLandscape ? 12240 : 15840,
    orientation,
    margins
  );
};

export const asWordCompatibleBlob = async (html, options = {}) => {
  const zip = new JSZip();

  zip.file('[Content_Types].xml', contentTypesXml, { createFolders: false });
  zip.folder('_rels').file('.rels', relsXml, { createFolders: false });

  zip
    .folder('word')
    .file('document.xml', renderDocumentFile(options), { createFolders: false })
    .file('afchunk.mht', getMHTdocument(html), { createFolders: false })
    .folder('_rels')
    .file('document.xml.rels', documentXmlRels, { createFolders: false });

  const buffer = await zip.generateAsync({ type: 'arraybuffer' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
};
