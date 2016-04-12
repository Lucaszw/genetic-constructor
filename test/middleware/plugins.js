import chai from 'chai';
import fs from 'fs';
import * as api from '../../src/middleware/api';

const { assert, expect } = chai;

const getBlock = (allBlocks, blockId) => {
  for (let i = 0; i < allBlocks.length; i++) {
    if (allBlocks[i].id === blockId) {
      return allBlocks[i];
    }
  }
};

describe('Middleware', () => {
  describe('Plugins', () => {
    it('computeWorkflow() should work'); //todo

    it('importConstruct() should be able convert Genbank features to Block', function testFunc(done) {
      fs.readFile('./test/res/sampleGenbank.gb', 'utf8', (err, sampleStr) => {
        api.importConstruct('genbank', sampleStr)
          .then(data => {
            // This just tests that the api works as expected. The tests about the particular
            // Genbank conversions to and from blocks are in the genbank.spec.js file
            expect(data.roots !== undefined).to.equal(true);
            expect(data.roots.length).to.equal(1);
            expect(data.blocks !== undefined).to.equal(true);
            let construct = getBlock(data.blocks, data.roots[0]);
            expect(construct.metadata.name).to.equal('EU912544');
            done();
          })
          .catch(err => {
            done(err);
          });
      });
    });

    it.skip('exportBlock() should be able convert Block to Genbank', function testFunc(done) {
      fs.readFile('./test/res/sampleBlocks.json', 'utf8', (err, sampleBlocksJson) => {
        const sampleBlocks = JSON.parse(sampleBlocksJson);
        api.exportBlock('genbank', sampleBlocks)
          .then(result => {
            expect(result.indexOf('acggtt') !== -1).to.equal(true);
            expect(result.indexOf('block           5..6') !== -1).to.equal(true);
            done();
          })
          .catch(err => {
            done(err);
          });
      });
    });

    it('importProject() should be able convert a genbank file to a project', function testFunc(done) {
      fs.readFile('./test/res/sampleGenbank.gb', 'utf8', (err, sampleGenbank) => {
        api.importProject('genbank', sampleGenbank)
          .then(result => {
            expect(result.ProjectId === undefined).to.equal(false);
            return api.loadProject(result.ProjectId)
              .then(gotRoll => {
                expect(gotRoll.project.metadata.name).to.equal('EU912544');
                expect(gotRoll.project.components.length).to.equal(1);
                expect(gotRoll.blocks.length).to.equal(8); // There are 8 blocks in that file
                done();
              });
          })
          .catch(err => {
            done(err);
          });
      });
    });

    it.skip('importProject() should be able convert feature file -.tab- to Blocks', function testFunc(done) {
      fs.readFile('./test/res/sampleFeatureFile.tab', 'utf8', (err, sampleFeatures) => {
        api.importProject('features', sampleFeatures)
          .then(result => {
            expect(result.project.components.length === 125).to.equal(true);
            expect(result.blocks[result.project.components[19]].metadata.name === '19:CBDcenA ').to.equal(true);
            done();
          })
          .catch(err => {
            done(err);
          });
      });
    });

    it.skip('search() should be able search NCBI nucleotide DB', function testFunc(done) {
      this.timeout(60000);  //searching NCBI

      const input = {query: 'carboxylase', max: 2};
      return api.search('nucleotide', input)
        .then(output => {
          assert(output[0].metadata.name !== undefined, 'got wrong name');
          assert(output[0].metadata.organism !== undefined, 'organism wasnt defined');
          assert(output.length === 2, 'got wrong number of outputs');
        });
    });
  });
});

