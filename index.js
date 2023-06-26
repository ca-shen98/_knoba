import { Client } from '@notionhq/client';

const notion = new Client({ auth: '<secret_rotated>' });
// TODO ratelimit asyncqueue retrybackoff

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

const referencesList = [
  [
    {
      type: 'notion',
      notion: { blockId: '6f7fe817-4ef0-430d-888c-077e3576f4a7' },
      lastSync: 0,
      lastEdit: { floor: 0, ceil: 0 }
    },
    {
      type: 'notion',
      notion: { blockId: '35a845e3-dc43-4f3b-84d4-b8568bca132d' },
      lastSync: 0,
      lastEdit: { floor: 0, ceil: 0 }
    }
  ]
];

async function retrieveReference(reference) {
  let retrieve = null;
  if (reference.type === 'notion') {
    try {
      retrieve = await notion.blocks.retrieve({ block_id: reference.notion.blockId });
      // notion api returns last_edited_time with minute granularity
      reference.lastEdit.floor = Date.parse(retrieve.last_edited_time);
      reference.lastEdit.ceil = new Date(reference.lastEdit.floor + 60000).getTime();
    } catch (error) { console.error(error); }
  }
  return { reference, retrieve };
};

async function updateReference(sink, source) {
  // invariant: source.lastEdit >= sink.lastEdit
  if (
    sink.reference.lastEdit.floor <= sink.reference.lastSync &&
    source.reference.lastEdit.ceil <= sink.reference.lastSync
  ) { return; }
  if (sink.reference.type !== 'notion' || source.reference.type !== 'notion') { return; }
  if (sink.reference.notion.blockId === source.reference.notion.blockId) { return; }
  // TODO check content equality?
  try {
    const update = await notion.blocks.update({
      block_id: sink.reference.notion.blockId,
      [sink.retrieve.type]: { text: source.retrieve[source.retrieve.type].text }
    });
    sink.reference.lastSync = Date.parse(update.last_edited_time);
  } catch (error) { console.error(error); }
};

function updateReferences(references) {
  Promise.all(references.map(retrieveReference)).then((referenceList) => {
      const source = referenceList.filter((reference) => reference.retrieve)
        .filter((reference) => reference.reference.lastSync < reference.reference.lastEdit.ceil)
        .reduce(
          (current, next) => (!current || next.reference.lastEdit.floor > current.reference.lastEdit.floor)
            ? next : current,
          null
        );
      return { source, referenceList };
    }).then(({ source, referenceList }) => !source ? Promise.resolve() :
        Promise.all(referenceList.map((sink) => updateReference(sink, source)))
          .then(() => { source.reference.lastSync = source.reference.lastEdit.floor; }));
};

setInterval(() => Promise.all(referencesList.map(updateReferences)), 5000);
