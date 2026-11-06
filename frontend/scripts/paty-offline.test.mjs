// Comprueba cómo reconoce Paty sin conexión las emergencias reales, y que coincida con el backend.
// Ejecutar: npm run test:offline
//
// paty-golden.json son las respuestas del backend a las frases de paty-cases.json. Se regenera con:
//   cd backend && dotnet run --project src/ElNino.API -- --export-offline ../../../frontend
// Si cambias reglas en TriageService o TipSearchService, regenéralo: este test avisará si engine.ts quedó distinto.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { answerOffline, searchTips, triage } from '../src/lib/paty/engine.ts'

const json = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
const knowledge = json('src/data/offline/knowledge.json')
const geo = { districts: json('public/offline/districts.json'), centers: json('public/offline/centers.json') }
const cases = json('scripts/paty-cases.json')
const golden = json('scripts/paty-golden.json')
const LIMA = { latitude: -11.9369, longitude: -76.6966 }
const ask = (message, coords = LIMA) => answerOffline(message, knowledge, geo, coords, new Date().getMonth())
const calls = (r) => r.actions.filter((a) => a.type === 'llamar').map((a) => a.value)

for (const m of cases.emergencies) test(`emergencia: ${m}`, () => assert.equal(ask(m).triage.level, 'Grave'))
for (const m of cases.notEmergencies) test(`no es emergencia: ${m}`, () => assert.notEqual(ask(m).triage.level, 'Grave'))

test('hay una respuesta del backend para cada frase', () => {
  const all = [...cases.emergencies, ...cases.notEmergencies, ...cases.other]
  assert.deepEqual(golden.map((g) => g.message), all)
})

for (const g of golden) {
  test(`igual que el backend: ${g.message}`, () => {
    const t = triage(g.message, knowledge)
    assert.equal(t.level, g.level, 'nivel')
    assert.equal(t.emergencyType ?? null, g.emergencyType ?? null, 'tipo')
    assert.equal(t.phoneNumber ?? null, g.phoneNumber ?? null, 'número')
    assert.deepEqual(searchTips(g.message, knowledge, 3).map((x) => x.title), g.tips, 'consejos')
  })
}

test('una emergencia siempre ofrece el número correcto', () => {
  assert.deepEqual(calls(ask('no respira', null)), ['106'])
  assert.deepEqual(calls(ask('hay un huayco', null)), ['116', '115'])
  assert.deepEqual(calls(ask('hay un huayco')), ['911', '116', '115'])
})

test('una pregunta sobre un peligro grave da un consejo y conserva el número', () => {
  const r = ask('qué hago si hay un derrumbe')
  assert.deepEqual(calls(r), ['116'])
  assert.match(r.reply, /116/)
  assert.ok(r.tips.length > 0)
})

test('una crisis de salud mental recibe la línea especializada', () => {
  for (const m of ['quiero matarme', 'como suicidarme', 'no quiero vivir']) {
    const r = ask(m)
    assert.equal(r.triage.level, 'Grave')
    assert.match(r.reply, /113/)
    assert.equal(calls(r)[0], '113')
  }
})

test('sin conexión nunca asegura que no hay peligro', () => {
  assert.match(ask('¿estoy a salvo?').reply, /no puedo confirmar/i)
  assert.match(ask('¿estoy a salvo?', null).reply, /no puedo confirmar/i)
})

test('da los números de emergencia', () => {
  for (const m of ['numero de bomberos', 'telefono del samu', 'numero de emergencia']) {
    assert.deepEqual(calls(ask(m, null)), ['106', '116', '115', '105'], m)
  }
})

test('saluda y pide la ubicación en vez de decir que no puede ayudar', () => {
  for (const m of ['hola', 'buenos dias', 'gracias', 'ayuda', 'quien eres', 'tengo miedo']) assert.match(ask(m).reply, /soy Paty/, m)
  assert.match(ask('dónde hay una posta', null).reply, /ubicación/)
})

test('encuentra consejos con otras palabras', () => {
  for (const m of ['que hago si llueve fuerte', 'zika', 'chikungunya', 'colera']) assert.ok(ask(m).tips.length > 0, m)
  assert.match(ask('agua').reply, /agua segura/i)
})

test('sin síntomas concretos pregunta por ellos, y un síntoma recibe consejo', () => {
  assert.match(ask('mi hijo esta enfermo').reply, /síntomas/)
  assert.deepEqual(calls(ask('mi hijo esta enfermo')), ['106'])
  assert.doesNotMatch(ask('mi hijo esta enfermo, tiene fiebre').reply, /Cuéntame/)
})

test('admite cuando no tiene información oficial, sin inventarla', () => {
  for (const m of ['friaje', 'heladas', 'sequia']) {
    const r = ask(m)
    assert.match(r.reply, /no tengo información oficial/i, m)
    assert.equal(r.tips.length, 0, m)
  }
})

test('el riesgo cubre todos los meses y distritos', () => {
  for (const d of geo.districts) {
    assert.equal(d.r.length, 12, d.u)
    assert.equal(d.pr.length, 12, d.u)
  }
})

test('fuera del Perú no inventa una posta lejana', () => {
  assert.equal(ask('donde hay una posta', { latitude: 40.4, longitude: -3.7 }).nearestCenters.length, 0)
})

test('los temas ajenos se rechazan', () => {
  assert.match(ask('cuéntame un chiste').reply, /Solo puedo ayudarte/)
})
