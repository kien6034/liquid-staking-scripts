import { MsgExecuteContract } from "@terra-money/feather.js";
import yargs from "yargs/yargs";
import { createLCDClient, createWallet, getPrefix, sendTxWithConfirm } from "./helpers";
import * as keystore from "./keystore";

const argv = yargs(process.argv)
  .options({
    network: {
      type: "string",
      demandOption: true,
    },
    key: {
      type: "string",
      demandOption: true,
    },
    "key-dir": {
      type: "string",
      demandOption: false,
      default: keystore.DEFAULT_KEY_DIR,
    },
    "hub-address": {
      type: "string",
      demandOption: true,
    },
  })
  .parseSync();

(async function () {
  const terra = createLCDClient(argv["network"]);
  const worker = await createWallet(terra, argv["key"], argv["key-dir"]);

  const keyAddr = worker.key.accAddress(getPrefix());
  console.log("Key address:", keyAddr);

  const { txhash } = await sendTxWithConfirm(worker, [
    new MsgExecuteContract(
      keyAddr,
      argv["hub-address"],
      {
        harvest: {},
      }
    ),
  ]);

  console.log(`Success! Txhash: ${txhash}`);
})();
