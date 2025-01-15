import { Wallet } from "@terra-money/feather.js";
import * as fs from "fs";
import * as path from "path";
import yargs from "yargs/yargs";
import {
  Chains,
  createLCDClient,
  createWallet,
  getPrefix,
  instantiateWithConfirm,
  storeCodeWithConfirm,
  waitForConfirm,
} from "../helpers";
import * as keystore from "../keystore";
import { InstantiateMsg } from "../types/tokenfactory/alliance-lst/eris_alliance_lst_whitewhale_instantiate";

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
    label: {
      type: "string",
      demandOption: true,
    },
    "key-dir": {
      type: "string",
      demandOption: false,
      default: keystore.DEFAULT_KEY_DIR,
    },
    admin: {
      type: "string",
      demandOption: false,
    },
    msg: {
      type: "string",
      demandOption: false,
    },
    "hub-code-id": {
      type: "number",
      demandOption: false,
    },
    "hub-binary": {
      type: "string",
      demandOption: false,
      default: "../artifacts/eris_alliance_lst_whitewhale.wasm",
    },
  })
  .parseSync();

async function uploadCode(deployer: Wallet, path: string) {
  await waitForConfirm(`Upload code ${path}?`);
  const codeId = await storeCodeWithConfirm(deployer, path);
  console.log(`Code uploaded! ID: ${codeId}`);
  return codeId;
}

const templates: Partial<Record<Chains, InstantiateMsg>> = {
  migaloo: {
    denom: "uwhalex",
    protocol_fee_contract: "migaloo1v767q4apajgksqlg5ejdakn8auszecje3yqfw6",
    protocol_reward_fee: "0",
    owner: "migaloo1ekgdfhgl3c3xecjp0py3wlzep6cly6v8pjywcg",
    operator: "migaloo1v767q4apajgksqlg5ejdakn8auszecje3yqfw6",
    epoch_period: 3 * 24 * 60 * 60, // 3 days
    unbond_period: 21 * 24 * 60 * 60, // 21 days
    utoken: "factory/migaloo1axtz4y7jyvdkkrflknv9dcut94xr5k8m6wete4rdrw4fuptk896su44x2z/uLP",
    validator_proxy: "migaloo1436kxs0w2es6xlqpp9rd35e3d0cjnw4sv8j3a7483sgks29jqwgshqdky4",
    whale_btc_pool: "migaloo1axtz4y7jyvdkkrflknv9dcut94xr5k8m6wete4rdrw4fuptk896su44x2z",
    btc_denom: "ibc/6E5BF71FE1BEBBD648C8A7CB7A790AEF0081120B2E5746E6563FC95764716D61",
  },
};

(async function () {
  const terra = createLCDClient(argv["network"]);
  const deployer = await createWallet(terra, argv["key"], argv["key-dir"]);

  const hubCodeId = argv["hub-code-id"] ?? (await uploadCode(deployer, path.resolve(argv["hub-binary"])));

  let msg: any;
  if (argv["msg"]) {
    msg = JSON.parse(fs.readFileSync(path.resolve(argv["msg"]), "utf8"));
  } else {
    msg = templates[argv["network"] as any as Chains];
  }

  msg["owner"] = msg["owner"] || deployer.key.accAddress(getPrefix());
  msg["operator"] = msg["operator"] || deployer.key.accAddress(getPrefix());

  console.log("\n" + JSON.stringify(msg).replace(/\\/g, "") + "\n");

  await waitForConfirm("Proceed to deploy contracts?");
  const result = await instantiateWithConfirm(
    deployer,
    argv["admin"] ? argv["admin"] : deployer.key.accAddress(getPrefix()),
    hubCodeId,
    msg,
    argv.label,
    {
      uwhale: "50000000",
    }
  );
  const address =
    result.logs[0].eventsByType["instantiate"]["_contract_address"][0] ??
    result.logs[0].eventsByType["instantiate"]["contract_address"][0];
  console.log(`Contract instantiated! Address: ${address}`);
})();
