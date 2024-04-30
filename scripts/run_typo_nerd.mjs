import "dotenv/config"
import { TypoNerd } from "../build/src/prebuilt/index.js"
import { run_against_egghead_files } from "./_runner.mjs"

const main = async () =>{
  await run_against_egghead_files(TypoNerd)
}

main()