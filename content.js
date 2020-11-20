/**
 * Admin partnerships
 *
 * @author Igor M Penaque <igor@mais.im>
 * @author Marcio Clume <clume@mais.im>
 * @date 18/11/2020
 * @version 18/11/2020
 */

window.Admin.partnerships = {
	/* -- Model --*/
	model: {
		// Empresas parceiras
		list: {
			_data: [],
			get: function(filter = null) {
				return this._data;
			},
			add: function(item) {
				item.id = item.partner_id;
				this._data.push(item);
			},
			remove: function(q) {
				const id = typeof q === 'object' ? q.id : q;
				const index = this._data.findIndex(function(item) {
					return item.id === id;
				});
				if (index > -1) {
					this._data.splice(index, 1);
				}
			},
			findById: function(id) {
				return this._data.find(function(item) {
					return item.id === id;
				});
			},
			set: function(data) {
				const self = this;
				this._data = [];
				data.forEach(function(item) {
					self.add(item);
				});
			},
		},

		// Status das parcerias
		status: {
			// Tipos
			types: {
				pending_sent: 0,
				pending_received: 1,
				approved: 2,
				denied: 3,
				closed: 4,
			},

			/**
				 * Retorna o nome do status.
				 *
				 * @param {int} status ID do status.
				 * @return {string} Nome do status.
				 */
			get_name: function(status) {
				return ['pending', 'pending', 'approved', 'denied', 'closed'][status];
			},
		},

		/**
			 * Carrega as empresas parceiras.
			 *
			 * @param {function} callback Função a ser executada após carregar as empresas.
			 */
		load: function(callback) {
			const self = this;

			Routing.ajax.requestWithCredentials('/admin/external-relationships/partnerships/list', {}, {}, {
				success: function(enterprises) {
					self.list.set(enterprises);
				},
				complete: callback,
			});
		},

		/**
			 * Aprova uma solicitação de parceria.
			 *
			 * @param {int} id ID da parceria.
			 * @param {function} callback Função a ser executada após aprovar a solicitação.
			 */
		approve: function(id, callback) {
			const self = this;

			Routing.ajax.requestWithCredentials('/admin/external-relationships/partnerships/accept', {id: id}, {type: 'POST'}, {
				success: function() {
					// Atualiza o registro na lista
					self.list.findById(id).status = Admin.partnerships.model.status.types.approved;

					// Função de callback
					if (typeof callback === 'function') {
						callback();
					}

					// Mensagem de sucesso
					Messenger.show('success', Language.texts.pages.admin_partnerships.approve.messages.success);
				},
				error: function(status) {
					// Mensagem de erro
					Messenger.show('error', Language.texts.pages.admin_partnerships.approve.messages.error, status);
				},
			});
		},

		/**
			 * Exclui uma parceria.
			 *
			 * @param {int} id ID da parceria.
			 * @param {string} type Tipo de exclusão.
			 * @param {function} callback Função a ser executada após a exclusão da parceria.
			 */
		delete: function(id, type, callback) {
			const self = this;
			const item = self.list.findById(id);

			if (item) {
				const partnership_id = item.partnership_id;

				Routing.ajax.requestWithCredentials('/admin/external-relationships/partnerships/delete', {
					partnership_id,
				}, {type: 'POST'}, {
					success: function() {
						// Remove o registro da lista
						self.list.remove(id);

						// Função de callback
						if (typeof callback === 'function') {
							callback();
						}

						// Mensagem de sucesso
						Messenger.show('success', Language.texts.pages.admin_partnerships[type].messages.success);
					},
					error: function(status) {
						// Mensagem de erro
						Messenger.show('error', Language.texts.pages.admin_partnerships[type].messages.error, status);
					},
				});
			}
		},

		/**
			 * Pesquisa empresas externas.
			 *
			 * @param {object} data Objeto com os valores dos campos do formulário.
			 * @param {function} callback Função a ser executada após a pesquisa.
			 */
		search_companies: function(data, callback) {
			const self = this; const rows = [];
			delete data.state;

			Routing.ajax.requestWithCredentials('/admin/external-relationships/search', data, {}, {
				success: function(companies) {
					// Remove as empresas que já são parceiras
					companies = companies.filter(function(company) {
						return self.list.get().findIndex(function(elem) {
							return (elem.id === company.id) && ([self.status.types.denied, self.status.types.closed].indexOf(elem.status) === -1);
						}) === -1;
					});

					// Monta a lista de resultados
					companies.forEach(function(company) {
						const row = $(Admin.partnerships.view.templates.companies.search_result);

						row.attr('data-id', company.id)
							.find('.fantasy-name').text(company.fantasy_name).end()
							.find('.corporate-name').text(company.corporate_name);

						rows.push(row);
					});

					// Exibe a lista de empresas
					const table = $('#enterprises-table');

					table.find('tbody > tr:not(.no-results)').remove().end().append(rows);
					Language.apply(table);
				},
				complete: callback,
			});
		},

		/**
			 * Adiciona uma empresa como parceira.
			 *
			 * @param {int} id ID da empresa.
			 */
		add_external_enterprise: function(id) {
			const self = this;

			Dialog.confirm(Language.texts.pages.admin_partnerships.search.add.confirmation.title, Language.texts.pages.admin_partnerships.search.add.confirmation.text, function() {
				Routing.ajax.requestWithCredentials('/admin/external-relationships/partnerships/request', {id: id}, {type: 'POST'}, {
					success: function(data) {
						const partners_table = $('#partners-table > tbody');


						const row = $('#enterprises-table tr[data-id="' + id + '"]'); const name = row.find('td:first > .fantasy-name').text();


						const status = self.status.types.pending_sent; const status_entry = self.status.get_name(status);


						const partner_row = $(Admin.partnerships.view.templates.companies.partner);

						partner_row.attr({'data-id': id, 'data-status': status})
							.find('td.name > .text').text(name).end()
							.find('td.status').attr('data-lang-text', '{pages.admin_partnerships.status.' + status_entry + '.description.sent}')
							.find('span').attr('data-lang-text', '{pages.admin_partnerships.status.' + status_entry + '.name}').end().end()
							.find('td.requests-count').text(0).end()
							.find('td.action.variable > a').addClass('disabled');

						Language.apply(partner_row);

						// Ordena a lista de parceiras
						partners_table.append(partner_row).find('> tr').tsort('> td.name > .text');
						Admin.partnerships.view.partners_search();

						// Insere no cache
						self.list.add({
							id: id,
							partner_id: id,
							partnership_id: data,
							name: name,
							status: status,
							pending_requests: 0,
						});

						// Remove a linha dos resultados da pesquisa
						row.remove();

						// Mensagem de sucesso
						Messenger.show('success', Language.texts.pages.admin_partnerships.search.add.messages.success);
					},
					error: function(status) {
						// Mensagem de erro
						Messenger.show('error', Language.texts.pages.admin_partnerships.search.add.messages.error, status);
					},
				});
			});
		},

		// Entrada/saída
		io: {
			/**
				 * Recebe solicitação de parceria.
				 *
				 * @param {object} data Dados da empresa e o nome do administrador que realizou a solicitação.
				 */
			receive_partnership_request: function(data) {
				// Monta o objeto de empresa parceira para inserir no cache
				const partner = {
					id: data.partner.id,
					partner_id: data.partner.id,
					partnership_id: data.partnership_id,
					name: data.partner.name,
					status: Admin.partnerships.model.status.types.pending_received,
					pending_requests: 0,
				};

				// Insere no cache
				Admin.partnerships.model.list.add(partner);

				// Insere a empresa na lista
				if (Routing.current.name === 'admin_partnerships') {
					const partners_table = $('#partners-table > tbody');

					const status_entry = Admin.partnerships.model.status.get_name(partner.status);
					const row = $(Admin.partnerships.view.templates.companies.partner);

					row.attr({'data-id': partner.id, 'data-status': partner.status})
						.find('td.name > .text').text(partner.name).end()
						.find('td.status').attr('data-lang-text', '{pages.admin_partnerships.status.' + status_entry + '.description.received}')
						.find('span').attr('data-lang-text', '{pages.admin_partnerships.status.' + status_entry + '.name}').end().end()
						.find('td.requests-count').text(partner.pending_requests).end()
						.find('td.action.variable > a').attr({'data-action': 'approve', 'data-lang-text': '{pages.admin_partnerships.approve.label}'});

					Language.apply(row);

					// Ordena a lista de parceiras
					partners_table.append(row).find('> tr').tsort('> td.name > .text');
					Admin.partnerships.view.partners_search();
				}

				// Aumenta a contagem de notificações no menu
				Menu.notifications.update('admin_partnerships', 1);

				// Exibe uma notificação
				if (User.info.settings.notifications.partnership_request) {
					BrowserNotification.display({
						id: 'partnership_request_' + data.partner.id,
						title: Language.texts.pages.admin_partnerships.notifications.partnership_request.title,
						text: sprintf(Language.texts.pages.admin_partnerships.notifications.partnership_request.text, data.admin_name, data.partner.name),
						icon: BrowserNotification.icons.get_url('partnership'),
						click: {type: 'admin-partnership'},
					});
				}
			},

			/**
				 * Recebe resposta de solicitação de parceria.
				 *
				 * @param {object} data Dados da empresa e o tipo de resposta da solicitação.
				 */
			receive_partnership_response: function(data) {
				const status = [Admin.partnerships.model.status.types.denied, Admin.partnerships.model.status.types.approved][data.type];

				// Atualiza o cache
				const item = Admin.partnerships.model.list.get().find(function(elem) {
					return (elem.id === data.partner.id)
					&& (
						(elem.status === Admin.partnerships.model.status.types.pending_sent)
						||
						(elem.status === Admin.partnerships.model.status.types.pending_received)
					);
				});
				const oldStatus = item.status;
				if (item) {
					item.status = status;
				}

				// Atualiza a empresa na lista
				if (Routing.current.name === 'admin_partnerships') {
					const row = $('#partners-table > tbody > tr[data-id="' + data.partner.id + '"][data-status="' + oldStatus + '"]');

					const status_entry = Admin.partnerships.model.status.get_name(status);

					row.attr('data-status', status)
						.find('td.status').attr('data-lang-text', '{pages.admin_partnerships.status.' + status_entry + '.description}')
						.find('span').attr('data-lang-text', '{pages.admin_partnerships.status.' + status_entry + '.name}');

					Language.apply(row);

					if (data.type === 1) {
						row.find('a[data-action="edit"]').removeClass('disabled');
					}

					Admin.partnerships.view.partners_search();
				}

				// Exibe uma notificação
				if (User.info.settings.notifications.partnership_response) {
					BrowserNotification.display({
						id: 'partnership_response_' + data.partner.id,
						title: Language.texts.pages.admin_partnerships.notifications.partnership_response.title,
						text: sprintf(Language.texts.pages.admin_partnerships.notifications.partnership_response.text, data.partner.name, Language.texts.pages.admin_partnerships.notifications.partnership_response.types[['denied', 'approved'][data.type]], data.admin_name),
						icon: BrowserNotification.icons.get_url('partnership'),
						click: {type: 'admin-partnership'},
					});
				}
			},

			/**
				 * Recebe encerramento de parceria.
				 *
				 * @param {object} data Dados da empresa e o nome do administrador que realizou a solicitação.
				 */
			receive_partnership_closure: function(data) {
				const status = Admin.partnerships.model.status.types.closed;

				// Atualiza o cache
				const item = Admin.partnerships.model.list.get().find(function(elem) {
					return (elem.id === data.partner.id) && (elem.status === Admin.partnerships.model.status.types.approved);
				});
				if (item) {
					item.status = status;
				}


				// Atualiza a empresa na lista
				if (Routing.current.name === 'admin_partnerships') {
					const row = $('#partners-table > tbody > tr[data-id="' + data.partner.id + '"][data-status="' + Admin.partnerships.model.status.types.approved + '"]');


					const status_entry = Admin.partnerships.model.status.get_name(status);

					row.removeClass('has-request').attr('data-status', status)
						.find('td.requests-count').text('0').end()
						.find('a[data-action="edit"]').addClass('disabled').end()
						.find('td.status').attr('data-lang-text', '{pages.admin_partnerships.status.' + status_entry + '.description}')
						.find('span').attr('data-lang-text', '{pages.admin_partnerships.status.' + status_entry + '.name}');

					Language.apply(row);

					// Sai do modo de edição caso a empresa estiver selecionada
					if (row.hasClass('current')) {
						row.removeClass('current');
						$('#partnerships').removeClass('editing');
						Routing.redirect('/admin/partnerships');
					}
				}

				// Exibe uma notificação
				if (User.info.settings.notifications.partnership_closure) {
					BrowserNotification.display({
						id: 'partnership_closure_' + data.partner.id,
						title: Language.texts.pages.admin_partnerships.notifications.partnership_closure.title,
						text: sprintf(Language.texts.pages.admin_partnerships.notifications.partnership_closure.text, data.admin_name, data.partner.name),
						icon: BrowserNotification.icons.get_url('partnership'),
						click: {type: 'admin-partnership'},
					});
				}
			},

			/**
				 * Recebe solicitação de relacionamento externo
				 *
				 * @param {object} data Dados da empresa parceira e a quantidade de solicitações recebidas.
				 */
			receive_relationship_request: function(data) {
				// Atualiza o cache
				const partner = Admin.partnerships.model.list.get().find(function(elem) {
					return (elem.id === data.partner.id) && (elem.status === Admin.partnerships.model.status.types.approved);
				});

				if (partner) {
					partner.pending_requests += data.requests_count;
					Admin.helpers.refreshPartnerRelationship(partner);
				}
				// Atualiza a empresa na lista
				if (Routing.current.name === 'admin_partnerships') {
					$('#partners-table > tbody > tr[data-id="' + data.partner.id + '"][data-status="' + Admin.partnerships.model.status.types.approved + '"]').addClass('has-request')
						.find('td.requests-count').text(partner.pending_requests);
				}

				// Aumenta a contagem de notificações no menu
				Menu.notifications.update('admin_partnerships', data.requests_count);

				// Exibe uma notificação
				if (User.info.settings.notifications.external_relationship_request) {
					BrowserNotification.display({
						id: 'external_relationship_request_' + data.partner.id,
						title: Language.texts.pages.admin_partnerships.notifications.relationship_request.title,
						text: sprintf(Language.texts.pages.admin_partnerships.notifications.relationship_request.text, data.partner.name),
						icon: BrowserNotification.icons.get_url('partnership'),
						click: {type: 'admin-partnership'},
					});
				}
			},
		},
	},

	/* -- View --*/

	view: {
		// Modelos HTML
		templates: {
			// Empresas
			companies: {
				// Empresa parceira
				partner: '\
						<tr>\
							<td class="name">\
								<span class="text"></span>\
								<span class="requests-flag" data-lang-attr="title" data-lang-text="{pages.admin_partnerships.enterprise_has_requests}" data-tooltip="s"></span>\
							</td>\
							\
							<td class="status" data-lang-attr="title" data-tooltip="s">\
								<span data-lang-attr="text"></span>\
							</td>\
							\
							<td class="requests-count"></td>\
							\
							<td class="action center variable">\
								<a data-action="edit" data-lang-attr=\'["text", "title"]\' data-lang-text="{common.actions.edit}" data-tooltip="s"></a>\
							</td>\
							\
							<td class="action center">\
								<a data-action="delete" data-lang-attr=\'["text", "title"]\' data-lang-text="{common.actions.delete}" data-tooltip="s"></a>\
							</td>\
						</tr>\
					',

				// Resultado de pesquisa de empresas
				search_result: '\
						<tr>\
							<td>\
								<span class="fantasy-name"></span>\
								<span class="corporate-name"></span>\
							</td>\
							\
							<td class="action center">\
								<a data-action="add" data-lang-attr=\'["text", "title"]\' data-lang-text="{pages.admin_partnerships.search.add.label}" data-tooltip="s"></a>\
							</td>\
						</tr>\
					',
			},

			// Relacionamentos
			relationships: {
				// Departamento
				department: '\
						<li class="department">\
							<strong class="caption">\
								<label class="field checkbox">\
									<input type="checkbox" class="caption-checkbox" name="caption_checkboxes[]" />\
									<span class="name"></span>\
								</label>\
							</strong>\
							<ul class="items"></ul>\
						</li>\
					',

				// Usuários
				users: {
					// Local
					local: '\
							<li class="user">\
								<span class="name"></span>\
								<span class="requests-flag" data-lang-attr="title" data-lang-text="{pages.admin_partnerships.user_has_requests}" data-tooltip="s"></span>\
							</li>\
						',

					// Relacionamento
					external: '\
							<li class="user">\
								<label class="field checkbox">\
									<input type="checkbox" name="relationships[]" disabled />\
									<span class="name"></span>\
									\
									<nav class="options">\
										<a data-action="waiting-approval" data-lang-attr=\'["text", "title"]\' data-lang-text="{pages.admin_partnerships.relationships.waiting_approval}" data-tooltip="s"></a>\
										<a data-action="accept-request" data-lang-attr=\'["text", "title"]\' data-lang-text="{pages.admin_partnerships.relationships.accept_request.label}" data-tooltip="s"></a>\
										<a data-action="deny-request" data-lang-attr=\'["text", "title"]\' data-lang-text="{pages.admin_partnerships.relationships.deny_request.label}" data-tooltip="s"></a>\
									</nav>\
								</label>\
							</li>\
						',
				},
			},
		},

		/**
			 * Renderiza a tabela de empresas parceiras.
			 */
		render_table: function() {
			const self = this; const rows = [];

			// Ordena a lista de empresas
			Admin.partnerships.model.list.get().sort(Object.comparator('name'));

			// Monta e exibe os registros
			Admin.partnerships.model.list.get().forEach(function(company) {
				const row = $(self.templates.companies.partner);
				const status_entry = Admin.partnerships.model.status.get_name(company.status);
				const status_description_entry = ([Admin.partnerships.model.status.types.pending_sent, Admin.partnerships.model.status.types.pending_received].indexOf(company.status) !== -1) ? ['.sent', '.received'][company.status] : '';

				let variable_action;

				if (company.status === Admin.partnerships.model.status.types.pending_received) {
					variable_action = {action: 'approve', lang_entry: 'pages.admin_partnerships.approve.label', url: null};
				} else {
					variable_action = {action: 'edit', lang_entry: 'common.actions.edit', url: '#/admin/partnerships?id=' + company.id};
				}

				row.attr({'data-id': company.id, 'data-status': company.status}).addClass((company.pending_requests > 0) ? 'has-request' : '')
					.find('td.name > .text').text(company.name).end()
					.find('td.status').attr('data-lang-text', '{pages.admin_partnerships.status.' + status_entry + '.description' + status_description_entry + '}')
					.find('span').attr('data-lang-text', '{pages.admin_partnerships.status.' + status_entry + '.name}').end().end()
					.find('td.requests-count').text(company.pending_requests).end()
					.find('td.action.variable > a')
					.attr({'data-action': variable_action.action, 'data-lang-text': '{' + variable_action.lang_entry + '}', 'href': variable_action.url})
					.addClass(([Admin.partnerships.model.status.types.pending_received, Admin.partnerships.model.status.types.approved].indexOf(company.status) === -1) ? 'disabled' : '');

				Language.apply(row);
				rows.push(row);
			});

			$('#partners-table > tbody').append(rows);

			// Associa métodos
			this.bind_methods();
		},

		/**
			 * Associa métodos à página de parcerias.
			 */
		bind_methods: function() {
			const self = this; const container = $('#partnerships'); const table = container.find('#partners-table');

			// Abre janela de busca de empresas
			container.on('click', 'button.search', function() {
				new Modal.instance('enterprises-search-modal', 'pages/admin/partnerships/search.html', 800, 'auto', '{pages.admin_partnerships.search.title}');
			});

			// Filtros
			container.on('click', 'input[name="show_only_pending_relationships_enterprises"], input[name="show_only_pending_partnerships_enterprises"]', self.partners_search);

			// Pesquisa uma empresa pelo nome
			container.on('input', '.data-table input[type="search"]', self.partners_search);

			// Cancela uma parceria
			table.on('click', 'a[data-action="delete"]', function() {
				const button = $(this); const row = button.closest('tr');


				const delete_type = ['cancel_partnership', 'deny_partnership', 'close_partnership', 'delete_partnership', 'delete_partnership'][parseInt(row.data('status'))];


				const confirmation_entry = Language.texts.pages.admin_partnerships[delete_type].confirmation;

				Dialog.confirm(confirmation_entry.title, confirmation_entry.text, function() {
					Admin.partnerships.model.delete(parseInt(row.data('id')), delete_type, function() {
						// Sai do modo de edição caso a empresa removida estiver selecionada
						if (row.hasClass('current')) {
							container.removeClass('editing');
							Routing.redirect('/admin/partnerships');
						}

						// Atualiza a contagem de notificações no menu
						if (row.data('status') === Admin.partnerships.model.status.types.pending_received) {
							Menu.notifications.update('admin_partnerships', -1);
						}

						// Remove o registro da tabela
						row.remove();

						// Atualiza a pesquisa
						self.partners_search();
					});
				});
			});

			// Aprova uma solicitação de parceria
			table.on('click', 'a[data-action="approve"]', function() {
				const button = $(this); const row = button.closest('tr');

				Dialog.confirm(Language.texts.pages.admin_partnerships.approve.confirmation.title, Language.texts.pages.admin_partnerships.approve.confirmation.text, function() {
					Admin.partnerships.model.approve(parseInt(row.data('id')), function() {
						const status_entry = Admin.partnerships.model.status.get_name(Admin.partnerships.model.status.types.approved);

						// Atualiza a contagem de notificações no menu
						Menu.notifications.update('admin_partnerships', -1);

						// Altera situação para 'aprovado'
						row.attr('data-status', Admin.partnerships.model.status.types.approved)
							.find('td.status').attr('data-lang-text', '{pages.admin_partnerships.status.' + status_entry + '.description}')
							.find('span').attr('data-lang-text', '{pages.admin_partnerships.status.' + status_entry + '.name}');

						button.attr({'data-action': 'edit', 'data-lang-text': '{common.actions.edit}'});
						Language.apply(row);

						// Atualiza a pesquisa
						self.partners_search();
					});
				});
			});

			// Edita relacionamentos
			let relationships_backup = [];


			const form = container.find('> .relationships'); const users_list = form.find('#users-list'); const relationships_list = form.find('#relationships-list');

			table.on('click', 'a[data-action="edit"]', function() {
				const button = $(this); const row = button.closest('tr'); const id = parseInt(row.data('id'));

				if (button.hasClass('disabled') || row.hasClass('current')) {
					return;
				}

				table.find('tr.current').removeClass('current');
				row.addClass('current');

				container.addClass('editing')
					.find('.relationships')
					.find('#relationships-list').addClass('disabled').end()
					.find('input[type="search"]').val('').trigger('search');

				// Rola até a lista de usuários
				if (Admin.relationships.view.noScroll) {
					Admin.relationships.view.noScroll = false;
				} else {
					Util.scroll_to(App.elements.main_content, form.offset().top - App.elements.header.outerHeight() - 40);
				}

				// Preenche o nome da lista externa com o nome da empresa parceira
				relationships_list.find('h4').text(table.find('tr.current > td.name > .text').text());

				// Carrega os usuários do parceiro
				Routing.ajax.requestWithCredentials('/admin/external-relationships/partner-users', {id: id}, {}, {
					success: function(departments) {
						const users_list_items = []; const relationships_list_items = [];

						// Ordena a lista de departamentos
						departments.sort(Object.comparator('name'));

						// Carrega a empresa parceira
						const partner = Admin.partnerships.model.list.findById(id);

						// Inicia o vetor de relacionamentos
						if (!('relationships' in partner)) {
							partner.relationships = [];
						}

						if (partner.relationships.length === 0) {
							Admin.users.model.list.forEach(function(user) {
								partner.relationships.push({
									id: user.id,
									relationships: [],
								});
							});

							// Preenche o vetor de relacionamentos
							departments.forEach(function(department) {
								department.users.sort(Object.comparator('name'));

								department.users.forEach(function(user) {
									user.relationships.forEach(function(relationship) {
										// TODO: ANALISAR SE A ALTERAÇÃO ABAIXO RESOLVE O PROBLEMA DE NÃO SE ACHAR O CONTATO NA LISTA LOCAL.
										const item = partner.relationships.find(function(elem) {
											return elem.id === relationship.id;
										});

										try {
											if (item) {
												item.relationships.push({
													id: user.id,
													approved: relationship.approved,
													request: relationship.request,
												});
											} else {
												// console.log('>>> ERRO AQUI.');
											}
										} catch (e) {
											// console.log('>>> ERRO: ', e);
										}
									});
								});
							});
						}

						// Realiza o backup
						Admin.partnerships.model.relationshipsBackup = JSON.parse(JSON.stringify(partner.relationships));
						relationships_backup = Admin.partnerships.model.relationshipsBackup;

						// Preenche a lista de usuários locais
						Admin.departments.model.list.forEach(function(department) {
							// Carrega os usuários do departamento
							const users = Admin.users.model.list.filter(function(elem) {
								return elem.department === department.id;
							});

							// Monta a lista de usuários
							if (users.length) {
								const department_item = $(self.templates.relationships.department);
								department_item.find('.caption').html(department.name);

								department_item.find('.items').html(users.map(function(user) {
									const item = $(self.templates.relationships.users.local);

									// Verifica se o usuário possui solicitações pendentes
									const requests_count = partner.relationships.find(function(elem) {
										return elem.id === user.id;
									}).relationships.filter(function(elem) {
										return elem.request;
									}).length;

									item.attr('data-id', user.id).addClass(requests_count ? 'has-request' : '')
										.find('.name').text(user.name);

									Language.apply(item);
									return item;
								}));

								users_list_items.push(department_item);
							}
						});

						users_list
							.find('> ul')
							.find('> li:not(.no-results)').remove().end()
							.append(users_list_items);

						// Preenche a lista de usuários externos
						departments.forEach(function(department) {
							if (department.users.length) {
								const department_item = $(self.templates.relationships.department);
								department_item.find('.caption span').text(department.name);

								department_item.find('.items').html(department.users.map(function(user) {
									const item = $(self.templates.relationships.users.external);

									item.attr('data-id', user.id)
										.find('input[type="checkbox"]').val(user.id)
										.siblings('.name').text(user.name);

									Language.apply(item);
									return item;
								}));

								relationships_list_items.push(department_item);
							}
						});

						relationships_list
							.find('> ul')
							.find('> li:not(.no-results)').remove().end()
							.append(relationships_list_items);
					},
				}, 'partner_users_' + id);
			});

			/* -- Funções das listas de relacionamentos --*/

			// Preenche os títulos das lista local com o nome da empresa
			users_list.find('h4').text(User.info.enterprise.name);

			form.on('input', 'input[type="search"]', function() {
				self.users_search($(this).closest('.list-wrapper').find('> .list'));
			});

			// Filtra somente usuários com solicitações de relacionamento
			form.on('change', 'input[name="show_only_pending_users"]', function() {
				self.users_search($(this).closest('.list-wrapper').find('> .list'));
			});

			// Seleciona um usuário para ver relacionamentos
			users_list.on('click', 'li.user', function() {
				const item = $(this);

				users_list.find('li.current').removeClass('current');
				item.addClass('current');

				const user_id = parseInt(item.data('id')); let relationships = [];

				// Carrega a empresa parceira
				const partner = Admin.partnerships.model.list.findById(
					parseInt(table.find('tr.current').data('id'))
				);

				// Carrega os relacionamentos do usuário
				relationships = partner.relationships.find(function(elem) {
					return elem.id === user_id;
				}).relationships;

				// Limpa a lista de relacionamentos
				relationships_list.parent().find('input[type="search"]').prop('disabled', false);
				relationships_list.removeClass('disabled').find('ul > li').removeClass('disabled waiting has-request').find('input[name="relationships[]"]').removeClass('checked').prop({disabled: true, checked: false, indeterminate: false});

				// Marca os relacionamentos do usuário na lista
				relationships_list
					.find('li.user:not([data-id="' + user_id + '"]) input[name="relationships[]"]').each(function() {
						const checkbox = $(this);
						checkbox.prop('disabled', false);

						const index = relationships.findIndex(function(elem) {
							return elem.id === parseInt(checkbox.val());
						});

						if (index !== -1) {
							checkbox.addClass('checked');

							if (!relationships[index].approved) {
								checkbox.prop('indeterminate', true).closest('li').addClass('waiting');
							} else {
								checkbox.prop('checked', true);
							}

							if (relationships[index].request) {
								checkbox.prop('disabled', true).closest('li').addClass('has-request');
							}
						}
					}).end()
					.find('li.user[data-id="' + user_id + '"]').addClass('disabled');

				// Set the caption checkbox as it should be
				relationships_list.find('ul.items').each(function() {
					const ulItem = $(this);
					const items = ulItem.find('input[type="checkbox"]:not(:disabled)').length;
					const checkedItems = ulItem.find('input.checked').length;
					const caption = ulItem.parent().find('.caption-checkbox');
					if (checkedItems >= items) {
						caption.prop('checked', true);
						caption.prop('indeterminate', true);
					} else if (checkedItems === 0) {
						caption.prop('checked', false);
						caption.prop('indeterminate', false);
					} else {
						caption.prop('indeterminate', true);
					}
				});

				// Atualiza a pesquisa na lista de usuários da empresa parceira
				self.users_search(container.find('#relationships-list'));
			});

			// Marca/desmarca um relacionamento
			relationships_list.on('click', 'input[name="relationships[]"]', function() {
				const checkbox = $(this); const list_item = checkbox.closest('li');
				const user_id = parseInt(users_list.find('li.current').data('id'));
				const related_user_id = parseInt(checkbox.val());

				// Carrega a empresa parceira
				const partner = Admin.partnerships.model.list.findById(parseInt(table.find('tr.current').data('id')));

				const user_relationships = partner.relationships.find(function(elem) {
					return elem.id === user_id;
				}).relationships;

				// Verifica se há uma solicitação pendente para esse usuário
				const relationship = user_relationships.find(function(elem) {
					return elem.id === related_user_id;
				});

				if (relationship && relationship.request) {
					return;
				}

				// Deixa o checkbox em estado indeterminado
				let isAlreadyApproved = false;
				if (relationship && relationship.approved) {
					checkbox.data('already-approved', true);
					isAlreadyApproved = true;
				} else {
					if (checkbox.data('already-approved')) {
						isAlreadyApproved = true;
					}
				}

				checkbox.toggleClass('checked');
				if (checkbox.hasClass('checked')) {
					if (!isAlreadyApproved) {
						checkbox.prop('indeterminate', true);
						list_item.addClass('waiting');
					}

					user_relationships.push({
						id: related_user_id,
						approved: isAlreadyApproved,
					});
				} else {
					const index = user_relationships.findIndex(function(elem) {
						return elem.id === related_user_id;
					});

					if (index !== -1) {
						user_relationships.splice(index, 1);
					}

					checkbox.prop('indeterminate', false);
					checkbox.prop('checked', false);
					list_item.removeClass('waiting');
				}

				const ulItem = $(this).closest('ul.items');
				const items = ulItem.find('input[type="checkbox"]:not(:disabled)').length;
				const checkedItems = ulItem.find('input.checked').length;
				const caption = $(this).closest('li.department').find('.caption-checkbox');
				if (checkedItems >= items) {
					caption.prop('checked', true);
					caption.prop('indeterminate', true);
				} else if (checkedItems === 0) {
					caption.prop('checked', false);
					caption.prop('indeterminate', false);
				} else {
					caption.prop('indeterminate', true);
				}
			});

			// Marcar/desmarcar tudo
			relationships_list.parent().find('.options').on('click', 'a', function() {
				if (!relationships_list.hasClass('disabled')) {
					switch ($(this).data('action')) {
						case 'check-all': // Marcar tudo
							relationships_list.find('input[name="relationships[]"]:not(:checked):not(:indeterminate)').trigger('click');
							break;

						case 'uncheck-all': // Desmarcar tudo
							relationships_list.find('input[name="relationships[]"]').filter(function(index, element) {
								return $(element).is(':checked') || $(element).is(':indeterminate');
							}).trigger('click');

							break;
					}
				}
			});

			// Marcar todos do departamento
			relationships_list.on('change', '.caption-checkbox', function() {
				if (this.checked && !$(this).prop('indeterminate')) {
					$(this).closest('li.department').find('input[name="relationships[]"]:not(:disabled)').each(function() {
						if (!this.checked && !$(this).prop('indeterminate')) {
							$(this).trigger('click');
						}
					});
				} else {
					$(this).closest('li.department').find('input[name="relationships[]"]:not(:disabled)').each(function() {
						if (this.checked || $(this).prop('indeterminate')) {
							$(this).trigger('click');
						}
					});
				}
			});


			// Opções de solicitação de relacionamento
			relationships_list.on('click', 'li.user .options > a', function() {
				const button = $(this);


				const local_user_id = parseInt(users_list.find('li.current').data('id'));


				const external_user_id = parseInt(button.closest('.user').find('input[name="relationships[]"]').val());

				switch (button.data('action')) {
					case 'accept-request': // Aprova uma solicitação
						Routing.ajax.requestWithCredentials('/admin/external-relationships/relationships/set', {local_user_id: local_user_id, external_user_id: external_user_id, action: 1}, {type: 'POST'}, {
							success: function() {
								button.closest('li').removeClass('waiting has-request').find('input[name="relationships[]"]').prop({disabled: false, indeterminate: false, checked: true});

								setTimeout(function() {
									container.find('input[name="show_only_pending_users"]').trigger('change');
								}, 0);

								// Atualiza a contagem de notificações no menu
								Menu.notifications.update('admin_partnerships', -1);

								// Carrega a empresa parceira
								const partner = Admin.partnerships.model.list.findById(parseInt(table.find('tr.current').data('id')));

								// Atualiza o cache
								const user_relationships = partner.relationships.find(function(elem) {
									return elem.id === local_user_id;
								}).relationships;

								const relationship_index = user_relationships.findIndex(function(elem) {
									return elem.id === external_user_id;
								});

								const relationship = user_relationships[relationship_index];
								relationship.approved = true;
								delete relationship.request;

								// Atualiza backup
								const backup_relationship = relationships_backup.find(function(elem) {
									return elem.id === local_user_id;
								}).relationships[relationship_index];

								backup_relationship.approved = true;
								delete backup_relationship.request;

								// Checa solicitações pendentes
								self.check_pending_requests();

								// Mensagem de sucesso
								const local_user_name = users_list.find('li.current').text();


								const external_user_name = button.closest('.user').find('.name').text();

								Messenger.show('success', sprintf(Language.texts.pages.admin_partnerships.relationships.accept_request.messages.success, local_user_name, external_user_name));
							},
							error: function(status) {
								// Mensagem de erro
								Messenger.show('error', Language.texts.pages.admin_partnerships.relationships.accept_request.messages.error, status);
							},
						});

						break;

					case 'deny-request': // Recusa uma solicitação
						Dialog.confirm(Language.texts.pages.admin_partnerships.relationships.deny_request.confirmation, Language.texts.common.cannot_undo, function() {
							Routing.ajax.requestWithCredentials('/admin/external-relationships/relationships/set', {local_user_id: local_user_id, external_user_id: external_user_id, action: 0}, {type: 'POST'}, {
								success: function() {
									button.closest('li').removeClass('waiting has-request').find('input[name="relationships[]"]').prop({disabled: false, indeterminate: false, checked: false});

									setTimeout(function() {
										container.find('input[name="show_only_pending_users"]').trigger('change');
									}, 0);

									// Atualiza a contagem de notificações no menu
									Menu.notifications.update('admin_partnerships', -1);

									// Carrega a empresa parceira
									const partner = Admin.partnerships.model.list.findById(parseInt(table.find('tr.current').data('id')));

									// Remove entrada do cache
									const user_relationships = partner.relationships.find(function(elem) {
										return elem.id === local_user_id;
									}).relationships;

									const relationship_index = user_relationships.findIndex(function(elem) {
										return elem.id === external_user_id;
									});

									user_relationships.splice(relationship_index, 1);

									// Atualiza backup
									relationships_backup.find(function(elem) {
										return elem.id === local_user_id;
									}).relationships.splice(relationship_index, 1);

									// Checa solicitações pendentes
									self.check_pending_requests();

									// Mensagem de sucesso
									Messenger.show('success', Language.texts.pages.admin_partnerships.relationships.deny_request.messages.success);
								},
								error: function(status) {
									// Mensagem de erro
									Messenger.show('error', Language.texts.pages.admin_partnerships.relationships.deny_request.messages.error, status);
								},
							});
						});

						break;
				}
			});

			// Salva relacionamentos
			form.on('submit', function() {
				const partner = Admin.partnerships.model.list.findById(parseInt(table.find('tr.current').data('id')));

				// Seleciona os relacionamentos adicionados e removidos
				const relationships = [];

				relationships_backup.forEach(function(user) {
					const previous_relationships = user.relationships; const added = []; const removed = [];

					const current_relationships = partner.relationships.find(function(elem) {
						return elem.id === user.id;
					}).relationships;

					// Adicionados
					current_relationships.forEach(function(relationship) {
						const is_added = previous_relationships.findIndex(function(elem) {
							return elem.id === relationship.id;
						}) === -1;

						if (is_added) {
							added.push(relationship.id);
						}
					});

					// Removidos
					previous_relationships.forEach(function(relationship) {
						const is_removed = current_relationships.findIndex(function(elem) {
							return elem.id === relationship.id;
						}) === -1;

						if (is_removed) {
							removed.push(relationship.id);
						}
					});

					if ((added.length > 0) || (removed.length > 0)) {
						relationships.push({
							id: user.id,
							added: added,
							removed: removed,
						});
					}
				});

				if (relationships.length) {
					Routing.ajax.requestWithCredentials('/admin/external-relationships/relationships/save', {partner_id: partner.id, relationships: relationships}, {type: 'POST'}, {
						success: function() {
							// Sai do modo de edição
							table.find('tr.current').removeClass('current');
							container.removeClass('editing');
							Routing.redirect('/admin/partnerships');

							// Mensagem de sucesso
							Messenger.show('success', Language.texts.pages.admin_users.relationships.messages.success);
						},
						error: function(status) {
							// Mensagem de erro
							Messenger.show('error', Language.texts.pages.admin_users.relationships.messages.error.save, status);
						},
					});
				} else {
					// Mensagem de nenhuma alteração realizada
					Messenger.show('info', Language.texts.common.no_changes);
				}

				// Limpa a submissão do formulário
				Form.clear_submit(form);
			});

			// Cancela edição
			container.on('click', '.relationships button.cancel', function() {
				const current_id = parseInt(table.find('tr.current').data('id'));

				if (!current_id) {
					return;
				}

				table.find('tr.current').removeClass('current');
				container.removeClass('editing');

				// Restaura os relacionamentos anteriores
				const partner = Admin.partnerships.model.list.findById(current_id);

				partner.relationships = relationships_backup.slice();

				// Retira o parâmetro da URL
				Routing.redirect('/admin/partnerships');
			});

			// Carrega os detalhes da empresa parceira de acordo com o parâmetro
			table.find('tr[data-id="' + Routing.current.params.id + '"] a[data-action="edit"]').trigger('click');

			// Detecta alteração de parâmetros
			App.elements.container.on('params_change', function() {
				if (Routing.current.name === '/admin/partnerships') {
					if ('id' in Routing.current.params) {
						table.find('tr[data-id="' + Routing.current.params.id + '"] a[data-action="edit"]').trigger('click');
					} else {
						container.find('> .relationships .cancel').trigger('click');
					}
				}
			});
		},

		/**
			 * Verifica se existem solicitações de relacionamento pendentes de usuários da empresa parceira.
			 */
		check_pending_requests: function() {
			const container = $('#partnerships'); const table = container.find('#partners-table'); const users_list = container.find('#users-list');


			const row = table.find('tr.current'); const user_item = users_list.find('li.current');

			const partner = Admin.partnerships.model.list.findById(parseInt(row.data('id')));

			// Conta a quantidade de solicitações pendentes da empresa parceira
			const partner_requests_count = partner.relationships.filter(function(elem) {
				return elem.relationships.find(function(sub_elem) {
					return Boolean(sub_elem.request);
				});
			}).length;

			// Conta a quantidade de solicitações pendentes para o usuário
			const user_requests_count = partner.relationships.filter(function(elem) {
				return (elem.id === parseInt(user_item.data('id'))) && elem.relationships.find(function(sub_elem) {
					return Boolean(sub_elem.request);
				});
			}).length;

			// Atualiza a contagem de solicitações pendentes
			row.find('td.requests-count').text(partner_requests_count);

			// Remove a marcação de solicitações pendentes do usuário
			if (!user_requests_count) {
				user_item.removeClass('has-request');
			}

			// Remove a marcação de solicitações pendentes da empresa
			if (!partner_requests_count) {
				row.removeClass('has-request');
			}

			// Atualiza os resultados da pesquisa atual
			this.partners_search();
		},

		/**
			 * Pesquisa uma empresa na lista de parceiras.
			 */
		partners_search: function() {
			const table = $('#partners-table');


			const filters_menu = $('#partnerships .data-table .menu.filters');


			let query = $('#partnerships .data-table input[type="search"]').val();


			let results = table.find('tbody > tr:not(.no-results)');


			let searched = false;

			query = query ? query.trim() : '';
			table.removeClass('searched no-results').find('tr').removeClass('result');

			// Com solicitações de relacionamento pendentes
			if (filters_menu.find('input[name="show_only_pending_relationships_enterprises"]').is(':checked')) {
				results = results.filter(function() {
					return $(this).hasClass('has-request');
				});

				searched = true;
			}

			// Com solicitação de parceria pendente
			if (filters_menu.find('input[name="show_only_pending_partnerships_enterprises"]').is(':checked')) {
				results = results.filter(function() {
					return parseInt($(this).attr('data-status')) === Admin.partnerships.model.status.types.pending_received;
				});

				searched = true;
			}

			// Pesquisa por nome
			if (query.length > 0) {
				results = results.filter(function() {
					return $(this).find('> td.name > .text').text().removeAccents().match(new RegExp(query.removeAccents(), 'gi'));
				});

				searched = true;
			}

			if (searched) {
				table.addClass('searched');
				results.addClass('result');

				if (results.length === 0) {
					table.addClass('no-results');
				}
			}
		},

		/**
			 * Pesquisa um usuário nas listas de relacionamentos.
			 *
			 * @param {object} list Objeto jQuery do elemento que contém a lista de usuários a ser pesquisada.
			 */
		users_search: function(list) {
			const query = list.parent().find('input[type="search"]').val().trim();


			let results = list.find('ul.items > li:not(.no-results)'); let searched = false;

			// Limpa a pesquisa
			list.removeClass('searched no-results').find('.department, .user').removeClass('result');

			// Com solicitações de relacionamento pendentes
			if (list.parent().find('header input[name="show_only_pending_users"]').is(':checked')) {
				results = results.filter(function() {
					return $(this).hasClass('has-request');
				});

				searched = true;
			}

			// Pesquisa por nome
			if (query.length > 0) {
				const regexp = new RegExp(query.removeAccents(), 'gi');

				results = results.filter(function() {
					return $(this).text().trim().removeAccents().match(regexp);
				});

				searched = true;
			}

			if (searched) {
				list.addClass('searched');
				results.addClass('result').closest('li.department').addClass('result');

				if (results.length === 0) {
					list.addClass('no-results');
				}
			}
		},
	},
};
