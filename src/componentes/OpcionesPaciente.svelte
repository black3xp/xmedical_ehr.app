<script>
    export let paciente;
    export let tipoTab;
</script>
<div class="contenedor-datos" id="divHeaderBar">
    <div class="row">
        <div class="col-md-6">
            <h5>
                <span class="badge badge-primary" data-bind="text: titulo">{tipoTab}</span>
                <span data-bind="text: paciente().nombreParaMostrar">{paciente.nombres} {paciente.primerApellido} {paciente.segundoApellido}</span>
            </h5>
        </div>
        <div class="col-md-6" style="text-align: right;">
                <div class="guardar-documento">
                    <div class="guardando mr-2 text-success" data-bind="html: content, class: contentClass"><i
                            class="mdi mdi-check-all"></i> <i>listo y guardado</i></div>
                </div>
        </div>
        <div class="col-lg-12">
            <div class="dropdown" data-bind="foreach: actionButtons">

                    <button data-toggle="modal" data-target="#modalDatosPersonales" style="box-shadow:none;"
                        class="btn btn-outline-secondary btn-sm">
                        <i data-bind="class: icon" class="mdi mdi-comment-eye"></i>
                        <sapn data-bind="text: text">Datos del Paciente</sapn>
                    </button>

                    <button data-bind=" class: itemClass,click: clickEvent" style="box-shadow:none;"
                        class="btn btn-outline-dark btn-sm">
                        <i data-bind="class: icon" class="mdi mdi-text"></i>
                        <sapn data-bind="text: text">Agregar Campo</sapn>
                    </button>

                    <button data-toggle="modal" data-target="#modalInterconsulta" style="box-shadow:none;"
                        class="btn btn-outline-dark btn-sm">
                        <i data-bind="class: icon" class="mdi mdi-repeat"></i>
                        <sapn data-bind="text: text">Registrar Interconsulta</sapn>
                    </button>

                    <button data-bind=" class: itemClass,click: clickEvent" style="box-shadow:none;"
                        class="btn btn-outline-dark btn-sm btn-hover-white">
                        <i data-bind="class: icon" class="mdi mdi-printer"></i>
                        <sapn data-bind="text: text">Imprimir</sapn>
                    </button>

                    <button data-toggle="modal" data-target="#modalAntecedentes" style="box-shadow:none;"
                        class="btn btn-outline-dark btn-sm">
                        <i data-bind="class: icon" class="mdi mdi-account-clock"></i>
                        <sapn data-bind="text: text">Antecedentes</sapn>
                    </button>

                    <button data-bind=" class: itemClass,click: clickEvent" style="box-shadow:none;"
                        class="btn btn-outline-danger btn-sm">
                        <i data-bind="class: icon" class="mdi mdi-delete"></i>
                        <sapn data-bind="text: text">Anular</sapn>
                    </button>
            </div>
        </div>
    </div>
</div>