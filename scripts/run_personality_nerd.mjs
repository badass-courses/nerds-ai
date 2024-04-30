import "dotenv/config"
import { PersonalityNerd } from "../build/src/prebuilt/index.js"
import { run_against_egghead_files } from "./_runner.mjs"

const main = async () =>{
  const personality = process.argv[2] || "Please propose edits that make it feel like this document was drafted by Spike from Buffy the Vampire Slayer."
  await run_against_egghead_files(PersonalityNerd)
}

main()