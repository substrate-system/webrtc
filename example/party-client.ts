import PartySocket from 'partysocket'
const PARTYKIT_HOST:string = (import.meta.env.MODE === 'development' ?
    'http://localhost:1999' :
    'https://rtcparty.nichoth.partykit.dev')

console.log('PARTYKIT_HOST', PARTYKIT_HOST)

export function Party ():InstanceType<typeof PartySocket> {
    const party = new PartySocket({
        host: PARTYKIT_HOST,
        room: 'example',
    })

    return party
}
