(() => {
  const staff = { user: { id: 'test-advisor' } };
  let onAuthState;
  const data = {
    staff_profiles: { display_name: 'Alex', role: window.fixtureStaffRole || 'advisor' },
    company_email_contacts: [{ id: 1, label: 'Intake support', email: 'intake@example.test' }],
    advisor_roster: [
      { id: 1, name: 'Alex', user_id: 'test-advisor', advisor_weekly_hours: [{ weekday: 1, starts_at: '08:30', ends_at: '17:30' }] },
      { id: 2, name: 'Morgan', user_id: 'test-colleague', advisor_weekly_hours: [{ weekday: 1, starts_at: '10:00', ends_at: '19:00' }] }
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
      from(table) {
        const response = { data: structuredClone(data[table] || []), error: null };
        let changes;
        const filters = new Map();
        const query = {
          select: () => query,
          update(values) { changes = values; return query; },
          eq(key, value) { filters.set(key, value); return query; },
          order: () => query,
          is(key, value) { filters.set(key, value); return query; }, in: () => query, neq: () => query, upsert: () => query, or: () => query,
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
      async rpc() { return { data: null, error: null }; }
    })
  };
})();
