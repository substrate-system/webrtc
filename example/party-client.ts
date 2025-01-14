import PartySocket from 'partysocket'
const PARTYKIT_HOST:string = 'http://localhost:1999'

export function Party ():InstanceType<typeof PartySocket> {
    const party = new PartySocket({
        host: PARTYKIT_HOST,
        room: 'example',
    })

    return party
}
