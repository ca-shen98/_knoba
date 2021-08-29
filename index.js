import { Client } from '@notionhq/client';

const notion = new Client({ auth: 'secret_osqIH2GJiPiOyHyfynaFP7VU4B2rbYGIPHDxEQkvnBe' });

// const rootPageId1 = '742c0a8a-9993-48e5-991a-3a385a583919';
// const rootPageId2 = '1b2a81eb-bd66-4dcd-879f-fb70f847ea0f';
//
// async function retrieveContentTree(rootId) {
//   const tree = { content: {}, children: [] };
//   const nodes = { [rootId]: tree };
//
//   const getChildrenRequests = [rootId];
//
//   while (getChildrenRequests.length !== 0) {
//     const requestId = getChildrenRequests.pop();
//     try {
//       // TODO ratelimit asyncqueue retrybackoff
//       const response = await notion.blocks.children.list({ block_id: requestId });
//       for (const block of response.results) {
//         const node = { content: block[block.type], children: [] };
//         nodes[requestId].children.push(node);
//         nodes[block.id] = node;
//         if (block.has_children) { getChildrenRequests.push(block.id); }
//       }
//     } catch (error) {
//       if (error.code === APIErrorCode.RATE_LIMITED) {
//         getChildrenRequests.unshift(requestId)
//       } else {
//         console.error(error);
//         return null;
//       }
//     }
//   }
//
//   return tree;
// };

const references = [
  {
    source: { type: 'notion', notion: { blockId: '6f7fe817-4ef0-430d-888c-077e3576f4a7' } },
    sinks: [{ type: 'notion', notion: { blockId: '35a845e3-dc43-4f3b-84d4-b8568bca132d' } }],
    lastSynced: 0
  }
];

async function updateReferences() {
  for (const { source, sinks, lastSynced } of references) {
    if (source.type !== 'notion') { continue; }
    let retrieveResponse;
    try {
      sourceRetrieveResponse = await notion.blocks.retrieve({ block_id: source[source.type].blockId });
    } catch (error) { console.error(error); }
    for (const sink of sinks) {
      if (sink.type !== 'notion') { continue; }
      try {
        const sinkRetrieveResponse = await notion.blocks.retrieve({ block_id: sink[sink.type].blockId });
        if (
          sourceRetrieveResponse.last_edited_time > lastSynced ||
          sinkRetrieveResponse.last_edited_time > lastSynced
        ) {
          const updateResponse = await notion.blocks.update({
            block_id: sink[sink.type].blockId,
            [sinkRetrieveResponse.type]: { text: sourceRetrieveResponse[sourceRetrieveResponse.type].text }
          });
        }
      } catch (error) { console.error(error); }
    }
  }
};

setInterval(updateReferences, 5000);
