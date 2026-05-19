import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://vdetqssagjdlvpffmorp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZXRxc3NhZ2pkbHZwZmZtb3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODQyNDUsImV4cCI6MjA5NDc2MDI0NX0.kMmilrlCcQP8qLy76ClvwfsHY774iLxJjGOfT8tQsNg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const selectDate = document.getElementById('select-date')
const sectionBesoins = document.getElementById('section-besoins')
const jaugeGateaux = document.getElementById('jauge-gateaux')
const jaugeVendeurs = document.getElementById('jauge-vendeurs')
const formInscription = document.getElementById('form-inscription')
const labelRoleGateau = document.getElementById('label-role-gateau')
const labelRoleVente = document.getElementById('label-role-vente')
const messageComplet = document.getElementById('message-complet')

let sessionsActives = []

async function init() {
    // Calculer la date du jour au format ISO (AAAA-MM-JJ)
    const aujourdHui = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('statut', 'actif')
        .gte('date_evenement', aujourdHui) // 👈 Ligne magique : supérieur ou égal à aujourd'hui
        .order('date_evenement', { ascending: true })

    if (error) {
        console.error("Erreur de chargement des sessions:", error.message)
        selectDate.innerHTML = '<option>Erreur de chargement...</option>'
        return
    }

    sessionsActives = data
    selectDate.innerHTML = '<option value="">-- Sélectionnez une date --</option>'
    sessionsActives.forEach(session => {
        const dateObj = new Date(session.date_evenement)
        const dateFormatee = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })
        const option = document.createElement('option')
        option.value = session.id
        option.textContent = `Vendredi ${dateFormatee}`
        selectDate.appendChild(option)
    })
}

selectDate.addEventListener('change', async (e) => {
    const sessionId = e.target.value
    if (!sessionId) {
        sectionBesoins.classList.add('hidden')
        return
    }

    const session = sessionsActives.find(s => s.id === sessionId)

    const { data: inscriptions, error } = await supabase
        .from('inscriptions')
        .select('role')
        .eq('session_id', sessionId)

    if (error) {
        console.error("Erreur inscriptions:", error.message)
        return
    }

    const nbGateaux = inscriptions.filter(i => i.role === 'gateau').length
    const nbVendeurs = inscriptions.filter(i => i.role === 'vente').length

    jaugeGateaux.textContent = `${nbGateaux} / ${session.max_gateaux}`
    jaugeVendeurs.textContent = `${nbVendeurs} / ${session.max_vendeurs}`
    sectionBesoins.classList.remove('hidden')

    const gateauComplet = nbGateaux >= session.max_gateaux
    const venteComplete = nbVendeurs >= session.max_vendeurs

    if (gateauComplet) labelRoleGateau.classList.add('hidden')
    else labelRoleGateau.classList.remove('hidden')

    if (venteComplete) labelRoleVente.classList.add('hidden')
    else labelRoleVente.classList.remove('hidden')

    if (gateauComplet && venteComplete) {
        messageComplet.classList.remove('hidden')
    } else {
        messageComplet.classList.add('hidden')
    }
})

formInscription.addEventListener('submit', async (e) => {
    e.preventDefault()

    const sessionId = selectDate.value
    if (!sessionId) {
        alert("Veuillez sélectionner une date ! 😊")
        return
    }

    const nom = document.getElementById('input-nom').value.trim()
    const contact = document.getElementById('input-contact').value.trim()
    const veutGateau = document.getElementById('check-gateau').checked
    const veutVente = document.getElementById('check-vente').checked

    if (!veutGateau && !veutVente) {
        alert("Veuillez cocher au moins une option (Gâteau et/ou Vente) ! 😊")
        return
    }

    const inscriptionsAEnvoyer = []
    if (veutGateau && !labelRoleGateau.classList.contains('hidden')) {
        inscriptionsAEnvoyer.push({ session_id: sessionId, nom_parent: nom, contact: contact, role: 'gateau' })
    }
    if (veutVente && !labelRoleVente.classList.contains('hidden')) {
        inscriptionsAEnvoyer.push({ session_id: sessionId, nom_parent: nom, contact: contact, role: 'vente' })
    }

    if (inscriptionsAEnvoyer.length === 0) {
        alert("Oups, les rôles sélectionnés viennent d'être complétés entre-temps !")
        return
    }

    const { error } = await supabase.from('inscriptions').insert(inscriptionsAEnvoyer)

    if (error) {
        alert("Erreur lors de l'inscription : " + error.message)
    } else {
        alert(`Merci ${nom} ! 🎉 Inscription validée.`)
        formInscription.reset()
        selectDate.dispatchEvent(new Event('change'))
    }
})

init()
