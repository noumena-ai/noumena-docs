//window.addEventListener('DOMContentLoaded', (event) => {
//	if (document.location.pathname.includes('functions.html')) {
//		try {
//			list_all_projects()
//		} catch (error) {
//			console.log(`UDFs: ${error}`)
//		}
//	}
//	//update_source_links()
//})

function update_source_links() {
	/**
	 * Update the [source] links on the client
	 */
	document.querySelectorAll("a.reference.external").forEach(function(e) {
		e.style.display='inline'
		e.href = `//${document.location.hostname}/jnr.php?path=/notebooks/lib/${document.location.hash.slice(1)}`
	})
}

/**
 * Append all projects and their modules to the page
 *
 * An instance has projects, and a project can have UDFs.
 * The UDFs are updated indepdently of the docs build.
 * The UDFs can be retrieved by API
 * The Sphinx function template can be populated for each UDF
 * Each rendered template can be appended to the DOM *
 * 
 * @return void
 */
async function list_all_projects() {
	// Helper function for createElement
	if (window.$E === undefined) {
		window.$E = function(t='div',p={},c=[]){ let e=document.createElement(t); Object.assign(e,p); e.append(...c); return e; }
	}

	/**
	 * Helper for the function signature
	 * @param  Object m            The module (e.g. the UDF)
	 * @param  Number project_id   The parent project id
	 * @return Node                The rendered template
	 */
	this.signature = function(m, project_id) {
		var params = []
		var first = true

		for (p of m.ordered_function_params) {
			var param = $E('em', {'classList': 'sig-param', 'innerText': p.name})
			if (p.is_optional) {
				params.push($E('span', {'classList': 'optional', 'innerText': '['}))
				params.push($E('span', {'innerText': ', '}))
				params.push(param)
				params.push($E('span', {'classList': 'optional', 'innerText': ']'}))
			} else {
				if (first) {
					first = false;
				} else {
					params.push($E('span', {'innerText': ', '}))
				}
				params.push(param)
			}
		}

		var id = `PROJECT:${project_id}_FUNCTION:${m.name.toUpperCase()}`
		var module_name = m.module_name !== undefined ? `${m.module_name.toUpperCase()}.` : '';

		var template = $E('dt', {'id': id}, [
				$E('code', {'classList': 'sig-name descname', 'innerText': `${module_name}${m.name.toUpperCase()}`}),
				$E('span', {'classList': 'sig-paren', 'innerText': '('}),
				...params,
				$E('span', {'classList': 'sig-paren', 'innerText': ')'}),
				$E('a', {'classList': 'headerLink', 'href': `#${id}`, 'innerText': '¶'})
			]);
		return template
	}

	/**
	 * Helper for the function parameters
	 * @param  Array ordered_function_params the parameters for the module
	 * @return Array                         an array of nodes
	 */
	this.ordered_function_params = function(ordered_function_params) {
		var params = []
		for (p of ordered_function_params) {
			params.push(
				$E('li', {}, [
					$E('p', {'innerHTML': `<strong>${p.name}</strong> - (${p.data_type}) ${p.description}`})
				])
			)
		}
		return params;
	}

	// -- Setup the page for UDFs ----------------------------------------------
	if (document.getElementById("udfs")) {
		document.getElementById("udfs").remove()
	}
	
	document.querySelector(".body").append(
		$E('div', {"classList": "section", "id": "udfs"}, [
			$E('h1', {'innerText': 'UDFs'}, [
				$E('a', {"innerText": '¶', 'href': "#udfs", 'classList': 'headerLink'})
			])
		])
	)
	
	const udf = document.getElementById("udfs")

	// -- Retrieve and Iterate Projects ----------------------------------------

	var origin = document.location.origin.replace(':8008', ':9000')
	//var origin = 'http://noumena-stage.nanigans.com:9000'
	var projects = await fetch(`${origin}/v1/projects`)
		.then(res => res.json())
		.then(data => data)

	for (project of projects.data) {
		var id = project.id
		var skip = false;
		var modules = await fetch(`${origin}/v1/projects/${id}/functions`)
			.then(res => {
			if (!res.ok) {
				throw new Error('Network response was not ok');
			}
			return res.json();
		}).catch(error => {
			skip = true
		})

		var udf_list = modules.data
		if (skip || udf_list.length == 0) {
			continue;
		}

		// After CMP-653 Include module name in project functions
		var module_names = project.module_name !== undefined ? `${project.module_name.toUpperCase()}.` : ''
		
		udf.append(
			$E('h2', {'innerText': `Project ${id} UDFs`, 'id': `PROJECT_${id}`}, [
				$E('a', {"innerText": '¶', 'href': `#PROJECT_${id}`, 'classList': 'headerLink'})
			])
		)

		for (m of udf_list) {
			// Clone of the Sphinx template
			var dl = $E('dl', {'classList': 'py function'}, [
				this.signature(m, id),
				$E('dd', {}, [
					$E('p', {'innerText': m.description}),
					$E('dl', {'classList': "field-list simple"}, [
						$E('dt', {'classList': "field-odd", 'innerText': 'Parameters'}),
						$E('dd', {'classList': "field-odd"}, [
							$E('ul', {'classList': "simple"}, this.ordered_function_params(m.ordered_function_params))
						]),
						$E('dt', {'classList': "field-even", 'innerText': 'Return type'}),
						$E('dd', {'classList': "field-even"}, [$E('b', {'innerText': 'Boolean'})]),
					])
				])
			]);
			udf.append(dl)
		}
	}
}
