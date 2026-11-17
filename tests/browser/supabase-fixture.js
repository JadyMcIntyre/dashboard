(() => {
  const staff = { user: { id: 'test-advisor' } };
  let onAuthState;
  const data = {
    staff_profiles: { display_name: 'Alex', role: window.fixtureStaffRole || 'advisor' },
    company_email_contacts: [{ id: 1, label: 'Intake support', email: 'intake@example.test' }],
    advisor_invitations: [],
    advisor_roster: [
      { id: 1, name: 'Alex', user_id: 'test-advisor', advisor_weekly_hours: [{ weekday: 1, starts_at: '08:30', ends_at: '17:30' }] },
      { id: 2, name: 'Morgan', user_id: 'test-colleague', advisor_weekly_hours: [{ weekday: 1, starts_at: '10:00', ends_at: '19:00' }] },
      { id: 3, name: 'Taylor', user_id: null, advisor_weekly_hours: [{ weekday: 1, starts_at: '09:15', ends_at: '17:30' }] }
    ],
    organization_contacts: {
      fax: '212-555-0100', website_url: 'https://renue.example.test',
      carecredit_url: 'https://carecredit.example.test', advance_care_url: 'https://advance-care.example.test',
      access_a_ride_url: 'https://transport.example.test', access_a_ride_phone: '212-555-0101'
    },
    clinic_opening_hours: [
      { clinic_id: 'CHELSEA', schedule: [['10:00', '18:30'], ['09:30', '20:30'], null, ['12:00', '20:30'], ['09:30', '20:30'], null, null] }
    ],
    clinic_treatment_prices: [
      ['NY', 500, 450, null], ['CHELSEA', 500, 450, 400],
      ['NJ', 525, 475, null], ['FL', null, null, null]
    ].map(([clinic_id, standard_price, promotional_price, offer_price]) =>
      ({ clinic_id, treatment: 'ivk', standard_price, promotional_price, offer_price })),
    clinic_contacts: [['NY', 'New Hyde Park'], ['CHELSEA', 'Chelsea'], ['NJ', 'Paramus'], ['FL', 'Crestview']]
      .map(([clinic_id, name], index) => ({ clinic_id, name, address: '100 Example Avenue, ' + name, phone: '212-555-010' + (index + 2) }))
  };
  window.supabase = {
    createClient: () => ({
      auth: {
        onAuthStateChange(callback) {
          onAuthState = callback;
          queueMicrotask(() => callback('INITIAL_SESSION', null));
        },
        async signInWithPassword() {
          onAuthState('SIGNED_IN', staff);
          return { error: null };
        },
        async signOut() {
          onAuthState('SIGNED_OUT', null);
          return { error: null };
        }
      },
      functions: {
        async invoke(name, { body }) {
          if (name !== 'invite-advisor') return { error: new Error('Unexpected function') };
          data.advisor_invitations.push({ email: body.email, status: 'pending' });
          return { data: { code: 'invited' }, error: null };
        }
      },
      from(table) {
        const response = { data: structuredClone(data[table] || []), error: null };
        let changes;
        const filters = new Map();
        const query = {
          select: () => query,
          update(values) { changes = values; return query; },
          eq(key, value) { filters.set(key, value); return query; },
          order: () => query,
          is(key, value) { filters.set(key, value); return query; }, in: () => query, neq: () => query, or: () => query,
          async upsert(shifts) {
            if (table !== 'advisor_weekly_hours') return response;
            for (const { advisor_id, ...shift } of shifts) {
              const hours = data.advisor_roster.find(advisor => advisor.id === advisor_id).advisor_weekly_hours;
              const index = hours.findIndex(entry => entry.weekday === shift.weekday);
              if (index < 0) hours.push(shift);
              else hours[index] = shift;
            }
            return { error: null };
          },
          async maybeSingle() {
            if (!['clinic_contacts', 'clinic_treatment_prices', 'clinic_opening_hours'].includes(table) || !changes) return response;
            const row = data[table].find(clinic =>
              [...filters].every(([key, value]) => key === 'schedule' ? JSON.stringify(clinic[key]) === value : clinic[key] === value)
            );
            if (row) Object.assign(row, changes);
            return { data: row ? { ...row } : null, error: null };
          },
          single: async () => response,
          then: (resolve, reject) => Promise.resolve(response).then(resolve, reject)
        };
        return query;
      },
      async rpc(name, args) {
        if (name !== 'assign_advisor_roster') return { data: null, error: null };
        const accounts = {
          'jordan@example.test': { name: 'Jordan', user_id: 'test-jordan' },
          'taylor@example.test': { name: 'Taylor', user_id: 'test-taylor' }
        };
        const account = accounts[args.account_email];
        if (!account) return { data: null, error: { code: 'PT404' } };
        const roster = data.advisor_roster;
        if (args.roster_id === null) {
          const id = roster.length + 1;
          roster.push({ ...account, id, advisor_weekly_hours: [] });
          return { data: id, error: null };
        }
        const row = roster.find(advisor => advisor.id === args.roster_id && !advisor.user_id);
        if (!row) return { data: null, error: { code: 'PT409' } };
        row.user_id = account.user_id;
        return { data: row.id, error: null };
      }
    })
  };
})();
